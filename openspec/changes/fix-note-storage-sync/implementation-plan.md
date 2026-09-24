# fix-note-storage-sync 详细实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: 用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 按任务逐条实现本计划。步骤用 `- [ ]` 复选框跟踪。

**Goal:** 把 `initNode` 从「只做单向插入」改成「扫目录与 SQL 双向对账」，修复 YAML 数字经 SQLite TEXT 亲和性变成 `'1.0'` 导致节点吊空不可见的问题，并补上缺失的「数据库有行、目录无文件 → 删除」方向。

**Architecture:** 全部对账判定收敛进 `electron/nodes/noteSync.cjs` 的纯函数（不 require electron / better-sqlite3），因此可用 `node --test` 覆盖；`initNode.js` 只做「取 db → 取路径 → 算 plan → 单事务落库 → 打日志」。渲染侧与数据库 schema 一律不动。

**Tech Stack:** Node.js CommonJS、better-sqlite3 8.7（仅主进程落库）、gray-matter、`node:test` + `node:assert/strict`。

**Spec:** `openspec/changes/fix-note-storage-sync/specs/note-storage-sync/spec.md`（契约）、`openspec/changes/fix-note-storage-sync/design.md`（根因与取舍）

## Global Constraints

- `electron/nodes/noteSync.cjs` MUST NOT require `electron` 或 `better-sqlite3`——前者在纯 Node 下不可用，后者是为 Electron 的 NODE_MODULE_VERSION 119 编译的，在 node 20（115）下 `require` 会抛 `ERR_DLOPEN_FAILED`。
- 字段规整统一用 `toStr`：`undefined | null | '' → null`，其余 `String(value)`。MUST NOT 直接绑定 frontmatter 标量。
- 硬删阶段 MUST 保护 `id === '1'` 或 `top === '0'` 的行。
- 重挂目标 MUST 取 survivors 里 `top === '0'` 的节点 id，MUST NOT 硬编码 `'1'`。
- 目录顶层没有 `.md` 时 MUST 跳过删除阶段。
- 回收站保留期清理与孤儿附件清理 MUST NOT 阻断启动。
- 单元测试 MUST NOT 写入 `demo-data/`，临时文件一律放 `os.tmpdir()`。
- 提交信息遵循仓库现有 `type(scope): 中文描述` 风格，**不带任何 AI 署名**。

---

## File Structure

| 文件 | 职责 |
|---|---|
| `electron/nodes/noteSync.cjs`（新增） | 纯函数：值规整、扫目录、算出对账 plan。不碰 db |
| `electron/nodes/noteSync.test.cjs`（新增） | `node:test` 覆盖全部判定分支 |
| `electron/nodes/initNode.js`（重写） | 唯一落库点：`scanNoteFiles` → `planReconcile` → 单事务 |
| `electron/ipc/file.cjs`（局部修改） | `openFile` 文件缺失兜底改用「id 前缀」匹配 |

---

### Task 1: noteSync.cjs 的字段规整

**Files:**
- Create: `electron/nodes/noteSync.cjs`
- Test: `electron/nodes/noteSync.test.cjs`

**Interfaces:**
- Consumes: `electron/ipc/trashUtils.cjs` 的 `ROOT_TOP`（值为 `'0'`）
- Produces:
  - `toStr(value) → string | null`（内部函数，不导出）
  - `normalizeFields(data) → { id, name, alias, top, left }`，`id` 可能为 `null`，`name` 兜底为 `''`，其余可能为 `null`，全部为 `string | null`
  - `ROOT_ID = '1'`

- [ ] **Step 1: 写失败的测试**

创建 `electron/nodes/noteSync.test.cjs`：

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  ROOT_ID, normalizeFields, isProtectedRoot, scanNoteFiles, planReconcile,
} = require('./noteSync.cjs');

const DEMO_ZH = path.join(__dirname, '..', '..', 'demo-data', 'zh');

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pn-sync-'));
const write = (dir, file, body) => fs.writeFileSync(path.join(dir, file), body, 'utf-8');

const note = (over = {}) => ({
  id: 'n1', name: 'n1', alias: null, top: '1', left: null, content: 'body', ...over,
});
const row = (over = {}) => ({
  id: 'n1', name: 'n1', alias: null, top: '1', left: null, content: 'body', delete: 0, ...over,
});
const rootRow = () => row({ id: '1', name: 'root', top: '0' });
const rootNote = () => note({ id: '1', name: 'root', top: '0' });

test('normalizeFields 把 YAML 标量规整为字符串', () => {
  assert.equal(normalizeFields({ id: 'a', top: 1 }).top, '1');
  assert.equal(normalizeFields({ id: 'a', top: 0 }).top, '0');
  assert.equal(normalizeFields({ id: 'a', left: '' }).left, null);
  assert.equal(normalizeFields({ id: 'a', title: 2024 }).name, '2024');
  assert.equal(normalizeFields({ id: 123 }).id, '123');
  assert.equal(normalizeFields({ id: 'a', alias: null }).alias, null);
});

test('normalizeFields 优先 title 并容忍缺失字段', () => {
  assert.equal(normalizeFields({ id: 'a', title: 'T', name: 'N' }).name, 'T');
  assert.equal(normalizeFields({ id: 'a', name: 'N' }).name, 'N');
  assert.equal(normalizeFields({ id: 'a' }).name, '');
  assert.equal(normalizeFields(undefined).id, null);
  assert.equal(normalizeFields(null).id, null);
});

test('isProtectedRoot 同时认定 id 为 1 与 top 为 0 的行', () => {
  assert.equal(ROOT_ID, '1');
  assert.equal(isProtectedRoot({ id: '1', top: null }), true);
  assert.equal(isProtectedRoot({ id: 'x', top: '0' }), true);
  assert.equal(isProtectedRoot({ id: '9.9', top: '1' }), false);
  assert.equal(isProtectedRoot(undefined), false);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test electron/nodes/noteSync.test.cjs`
Expected: FAIL —— `Cannot find module './noteSync.cjs'`

- [ ] **Step 3: 写最小实现**

创建 `electron/nodes/noteSync.cjs`：

```js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { ROOT_TOP } = require('../ipc/trashUtils.cjs');

const ROOT_ID = '1';

// frontmatter 值规整：空/缺失 → null，其余一律 String()。
// YAML 里不带引号的数字会被解析成 number，原样绑定进 TEXT 列会被 SQLite 转成
// '1' -> '1.0'，与任何 id 都不相等，节点吊空后在脑图上不可见。
// 必须收敛在这一层：渲染侧依赖 `top === '0'`、`nodeMap.has(top)` 的严格字符串比较。
function toStr(value) {
  if (value === undefined || value === null) return null;
  const s = String(value);
  return s === '' ? null : s;
}

function normalizeFields(data) {
  const d = data && typeof data === 'object' ? data : {};
  return {
    id: toStr(d.id),
    name: toStr(d.title) ?? toStr(d.name) ?? '',
    alias: toStr(d.alias),
    top: toStr(d.top),
    left: toStr(d.left),
  };
}

// 根行保护：不看 top 单字段，因为历史 bug 已把根行 top 写成 NULL
function isProtectedRoot(row) {
  return !!row && (String(row.id) === ROOT_ID || row.top === ROOT_TOP);
}

module.exports = { ROOT_ID, normalizeFields, isProtectedRoot };
```

`scanNoteFiles` 与 `planReconcile` 分别在 Task 2、Task 3 中实现，届时同步扩这行导出。本步的 3 个测试只断言已实现的函数，不要提前引用未定义的名字。

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test electron/nodes/noteSync.test.cjs`
Expected: PASS —— 3 个测试通过

- [ ] **Step 5: 提交**

```bash
git add electron/nodes/noteSync.cjs electron/nodes/noteSync.test.cjs
git commit -m "feat(notes): 新增 noteSync 字段规整，修复 YAML 数字被写成 '1.0'"
```

---

### Task 2: scanNoteFiles 扫目录

**Files:**
- Modify: `electron/nodes/noteSync.cjs`
- Modify: `electron/nodes/noteSync.test.cjs`

**Interfaces:**
- Consumes: `normalizeFields`（Task 1）
- Produces: `scanNoteFiles(storagePath) → { notes: Array<{id,name,alias,top,left,content}>, skipped: Array<{file, reason}> }`
  - `notes[i].id` 保证非空字符串；`content` 为不带 frontmatter 的正文
  - `skipped[0].file` 为 `null` 表示目录本身读不了

- [ ] **Step 1: 写失败的测试**

在 `electron/nodes/noteSync.test.cjs` 末尾追加：

```js
test('scanNoteFiles 读取 demo 夹具（只读，不写入）', () => {
  const { notes, skipped } = scanNoteFiles(DEMO_ZH);
  assert.equal(notes.length, 12);
  assert.deepEqual(skipped, []);
  const root = notes.find((n) => n.id === 'zho01root001');
  assert.equal(root.top, '0');
  assert.equal(root.name, '操作系统');
  assert.ok(notes.every((n) => typeof n.top === 'string' && typeof n.content === 'string'));
  // 正文不含 frontmatter
  assert.ok(notes.every((n) => !n.content.startsWith('---')));
});

test('scanNoteFiles 跳过无 id 的文件并给出原因', () => {
  const dir = tmpDir();
  write(dir, 'good.md', '---\nid: g1\ntitle: G\ntop: "1"\n---\nbody\n');
  write(dir, 'bad.md', '---\ntitle: 副业|测试\n---\n123\n');
  write(dir, 'not-note.txt', 'ignored');
  const { notes, skipped } = scanNoteFiles(dir);
  assert.deepEqual(notes.map((n) => n.id), ['g1']);
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0].file, 'bad.md');
  assert.match(skipped[0].reason, /id/);
});

test('scanNoteFiles 按文件名排序，保证重复 id 的胜出者确定', () => {
  const dir = tmpDir();
  write(dir, 'b.md', '---\nid: b1\ntop: "1"\n---\nb\n');
  write(dir, 'a.md', '---\nid: a1\ntop: "1"\n---\na\n');
  assert.deepEqual(scanNoteFiles(dir).notes.map((n) => n.id), ['a1', 'b1']);
});

test('scanNoteFiles 在目录不可读时返回 skipped 而非抛出', () => {
  const missing = path.join(tmpDir(), 'missing-subdir');
  const { notes, skipped } = scanNoteFiles(missing);
  assert.deepEqual(notes, []);
  assert.equal(skipped.length, 1);
  assert.equal(skipped[0].file, null);
  assert.match(skipped[0].reason, /readdir failed/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test electron/nodes/noteSync.test.cjs`
Expected: FAIL —— `scanNoteFiles is not a function`

- [ ] **Step 3: 实现 scanNoteFiles**

把 `noteSync.cjs` 中的 `isProtectedRoot` 之后追加：

```js
function scanNoteFiles(storagePath) {
  const notes = [];
  const skipped = [];
  let names;
  try {
    names = fs.readdirSync(storagePath);
  } catch (error) {
    return { notes, skipped: [{ file: null, reason: `readdir failed: ${error.message}` }] };
  }
  // 排序：多份文件共用同一 id 时，胜出者必须确定，否则连续两次启动会来回翻转
  names.sort();
  for (const file of names) {
    if (path.extname(file) !== '.md') continue;
    try {
      const parsed = matter(fs.readFileSync(path.join(storagePath, file), 'utf-8'));
      const fields = normalizeFields(parsed.data);
      if (!fields.id) {
        skipped.push({ file, reason: 'frontmatter 缺少 id' });
        continue;
      }
      notes.push({ ...fields, content: parsed.content });
    } catch (error) {
      skipped.push({ file, reason: error.message });
    }
  }
  return { notes, skipped };
}
```

- [ ] **Step 4: 更新导出**

把 `noteSync.cjs` 的 `module.exports` 改为：

```js
module.exports = { ROOT_ID, normalizeFields, isProtectedRoot, scanNoteFiles };
```

- [ ] **Step 5: 运行测试确认通过**

Run: `node --test electron/nodes/noteSync.test.cjs`
Expected: PASS —— 7 个测试通过

- [ ] **Step 6: 提交**

```bash
git add electron/nodes/noteSync.cjs electron/nodes/noteSync.test.cjs
git commit -m "feat(notes): scanNoteFiles 扫目录并跳过无 id 文件"
```

---

### Task 3: planReconcile 对账判定

**Files:**
- Modify: `electron/nodes/noteSync.cjs`
- Modify: `electron/nodes/noteSync.test.cjs`

**Interfaces:**
- Consumes: `scanNoteFiles` 的 `notes` / `skipped`（Task 2）；DB 行数组，每行形如 `{ id, name, alias, top, left, content, delete }`
- Produces: `planReconcile({ notes, skipped, rows }) → { inserts, updates, removes, skipped, warn }`
  - `inserts[i]` = `{ id, name, alias, top, left, content, delete: 0 }`（无对应行）
  - `updates[i]` = 同上形状（有对应行且字段不同，或需从 `delete=1` 恢复）
  - `removes[i]` = `string`（要硬删的行 id）
  - `warn[i]` = `string`；`skipped` 原样透传

- [ ] **Step 1: 写失败的测试**

在 `electron/nodes/noteSync.test.cjs` 末尾追加：

```js
test('planReconcile 新增目录里有、DB 里没有的笔记', () => {
  const plan = planReconcile({
    notes: [rootNote(), note({ id: 'n1', top: '1' })],
    rows: [rootRow()],
  });
  assert.deepEqual(plan.inserts.map((n) => n.id), ['n1']);
  assert.equal(plan.inserts[0].top, '1');
  assert.equal(plan.inserts[0].delete, 0);
  assert.deepEqual(plan.updates, []);
  assert.deepEqual(plan.removes, []);
  assert.deepEqual(plan.warn, []);
});

test('planReconcile 修复脏行：top 1.0 与带 frontmatter 的 content', () => {
  const plan = planReconcile({
    notes: [rootNote(), note({ id: 'z', top: '1', content: '正文' })],
    rows: [rootRow(), row({ id: 'z', top: '1.0', content: '---\nid: z\n---\n正文' })],
  });
  assert.deepEqual(plan.updates.map((n) => n.id), ['z']);
  assert.equal(plan.updates[0].top, '1');
  assert.equal(plan.updates[0].content, '正文');
  assert.deepEqual(plan.inserts, []);
});

test('planReconcile 恢复回到目录的软删笔记', () => {
  const plan = planReconcile({
    notes: [rootNote(), note({ id: 'z', top: '1' })],
    rows: [rootRow(), row({ id: 'z', top: '1', delete: 1 })],
  });
  assert.deepEqual(plan.updates.map((n) => n.id), ['z']);
  assert.equal(plan.updates[0].delete, 0);
  assert.ok(plan.warn.some((w) => /自动恢复/.test(w)));
});

test('planReconcile 硬删目录里已不存在的行，但不碰根', () => {
  const plan = planReconcile({
    notes: [rootNote()],
    rows: [rootRow(), row({ id: 'orphan', top: '1' })],
  });
  assert.deepEqual(plan.removes, ['orphan']);
});

test('planReconcile 根行 top 为 NULL 且无文件时仍不被删', () => {
  const plan = planReconcile({
    notes: [rootNote()],
    rows: [row({ id: '1', name: 'root', top: null })],
  });
  assert.deepEqual(plan.removes, []);
});

test('planReconcile 目录里没有任何 .md 时跳过删除并告警', () => {
  const plan = planReconcile({
    notes: [],
    rows: [rootRow(), row({ id: 'orphan', top: '1' })],
  });
  assert.deepEqual(plan.removes, []);
  assert.ok(plan.warn.some((w) => /跳过删除阶段/.test(w)));
});

test('planReconcile 把父节点不可达的笔记重挂到根（根 id 为 1）', () => {
  const plan = planReconcile({
    notes: [rootNote(), note({ id: 'c', top: 'gone' })],
    rows: [rootRow(), row({ id: 'c', top: 'gone' })],
  });
  assert.equal(plan.updates.find((n) => n.id === 'c').top, '1');
  assert.ok(plan.warn.some((w) => /重挂到根/.test(w)));
});

test('planReconcile 把父节点不可达的笔记重挂到自定义根 id', () => {
  const plan = planReconcile({
    notes: [
      note({ id: 'zho01root001', name: '操作系统', top: '0' }),
      note({ id: 'c', top: 'gone' }),
    ],
    rows: [],
  });
  assert.equal(plan.inserts.find((n) => n.id === 'c').top, 'zho01root001');
});

test('planReconcile 在没有任何根时只告警不重挂', () => {
  const plan = planReconcile({
    notes: [note({ id: 'c', top: 'gone' }), note({ id: 'd', top: 'c' })],
    rows: [],
  });
  assert.equal(plan.inserts.find((n) => n.id === 'c').top, 'gone');
  assert.ok(plan.warn.some((w) => /根节点不可用/.test(w)));
});

test('planReconcile 对多份文件共用同一 id 给出告警且只落一条', () => {
  const plan = planReconcile({
    notes: [rootNote(), note({ id: 'dup', content: 'A' }), note({ id: 'dup', content: 'B' })],
    rows: [rootRow()],
  });
  assert.equal(plan.inserts.length, 1);
  assert.ok(plan.warn.some((w) => /多份文件共用 id/.test(w)));
});

test('planReconcile 透传 skipped', () => {
  const skipped = [{ file: 'bad.md', reason: 'frontmatter 缺少 id' }];
  const plan = planReconcile({ notes: [rootNote()], skipped, rows: [rootRow()] });
  assert.deepEqual(plan.skipped, skipped);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test electron/nodes/noteSync.test.cjs`
Expected: FAIL —— `planReconcile is not a function`

- [ ] **Step 3: 实现 planReconcile**

在 `noteSync.cjs` 的 `scanNoteFiles` 之后追加：

```js
function differs(row, note) {
  return (row.name ?? null) !== note.name
    || (row.alias ?? null) !== note.alias
    || (row.top ?? null) !== note.top
    || (row.left ?? null) !== note.left
    || (row.content ?? null) !== note.content;
}

// 纯函数：输入文件侧解析结果 + DB 行，输出待执行的增/改/删与告警，不碰 db
function planReconcile({ notes, skipped = [], rows }) {
  const warn = [];
  const fileById = new Map();
  for (const note of notes) {
    if (fileById.has(note.id)) warn.push(`多份文件共用 id: ${note.id}`);
    fileById.set(note.id, note);
  }
  const rowById = new Map();
  for (const row of rows) {
    if (rowById.has(row.id)) warn.push(`DB 重复 id: ${row.id}`);
    rowById.set(row.id, row);
  }

  const survivors = [...fileById.values()].map((n) => ({ ...n, delete: 0 }));

  // 反向：delete=0 但目录里没有对应文件 → 硬删。目录里没有任何 .md 时整体跳过
  const orphans = rows.filter(
    (r) => Number(r.delete) === 0 && !isProtectedRoot(r) && !fileById.has(r.id),
  );
  let removes = [];
  if (survivors.length === 0) {
    if (orphans.length) warn.push('目录中没有任何 .md，跳过删除阶段（防止存储盘未挂载/半同步时清库）');
  } else {
    removes = orphans.map((r) => r.id);
  }

  // 可见集合 = 对账后 delete=0 的节点。没有文件又不被删除的行（受保护的根）同样算可见，
  // 否则会给它的子节点刷出无意义的重挂告警。
  const visibleIds = new Set(survivors.map((n) => n.id));
  for (const r of rows) {
    const willBeRemoved = Number(r.delete) === 0 && !isProtectedRoot(r) && !fileById.has(r.id);
    if (willBeRemoved) continue;
    if (Number(r.delete) === 0 || fileById.has(r.id)) visibleIds.add(r.id);
  }

  // 根 id 优先取文件侧的根（不硬编码 '1'：demo-data 用 top: "0" / id: "zho01root001"），
  // 取不到才退回 DB 里可见的 '1'
  const rootNote = survivors.find((n) => n.top === ROOT_TOP);
  const rootId = rootNote ? rootNote.id : (visibleIds.has(ROOT_ID) ? ROOT_ID : null);

  // 沿 DB 的 top 链上溯，返回第一个可见祖先（可穿过已软删/已失踪的父节点）。
  // 不直接挂根：App 删节点时把子节点提升到「上一级」（MindMap.jsx 的 promoteChildren），
  // 只有落到同一个祖先上才与 App 的语义一致；一路掉到根会把节点从原来的位置甩走。
  const nearestVisibleAncestor = (startId) => {
    let current = startId;
    const seen = new Set();
    while (current && !seen.has(current)) {
      if (visibleIds.has(current)) return current;
      seen.add(current);
      const parentRow = rowById.get(current);
      current = parentRow ? parentRow.top : null;
    }
    return null;
  };

  // 可见性不变量：delete=0 的节点必须可从根可达
  for (const note of survivors) {
    if (note.id === rootId) continue;
    if (note.top === ROOT_TOP) continue;
    if (note.top && visibleIds.has(note.top)) continue;
    const target = (note.top && nearestVisibleAncestor(note.top)) || rootId;
    if (!target) {
      warn.push(`根节点不可用，跳过重挂: ${note.id} (top=${note.top ?? 'null'})`);
      continue;
    }
    const where = target === rootId ? '根' : '最近可用祖先';
    warn.push(`父节点不可达，重挂到${where}: ${note.id} (top=${note.top ?? 'null'} -> ${target})`);
    note.top = target;
  }

  const inserts = [];
  const updates = [];
  for (const note of survivors) {
    const row = rowById.get(note.id);
    if (!row) {
      inserts.push(note);
      continue;
    }
    if (Number(row.delete) === 1) warn.push(`文件回到目录，自动恢复: ${note.id}`);
    if (Number(row.delete) === 1 || differs(row, note)) updates.push(note);
  }

  return { inserts, updates, removes, skipped, warn };
}
```

把 `module.exports` 改为：

```js
module.exports = {
  ROOT_ID, normalizeFields, isProtectedRoot, scanNoteFiles, planReconcile,
};
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test electron/nodes/noteSync.test.cjs`
Expected: PASS —— 21 个测试通过（Task 1 的 3 个 + Task 2 的 4 个 + 本任务 11 个 + Task 7 的 3 个）

- [ ] **Step 5: 提交**

```bash
git add electron/nodes/noteSync.cjs electron/nodes/noteSync.test.cjs
git commit -m "feat(notes): planReconcile 双向对账，含硬删/恢复/重挂/空目录守门"
```

---

### Task 4: 重写 initNode 接入对账

**Files:**
- Modify: `electron/nodes/initNode.js`（整体重写）

**Interfaces:**
- Consumes: `scanNoteFiles`、`planReconcile`（Task 3）；`getDb()`（`electron/db/db.cjs`）、`getDataPath()`（`electron/ipc/userPath.cjs`）、`purgeExpiredTrash()`（`electron/ipc/trash.cjs`）、`sweepUnreferencedAttachments()`（`electron/ipc/attachment.cjs`）
- Produces: `initNode()`（签名不变，调用点无需改动）

**说明：本任务没有自动化测试。** `initNode.js` 依赖 `better-sqlite3`（为 Electron 的 NODE_MODULE_VERSION 119 编译）与 `electron`，在纯 `node --test` 下无法加载，仓库也没有 Electron 测试宿主。验证方式为 Step 3 的语法检查 + Task 6 的手动端到端验证。

- [ ] **Step 1: 重写文件**

用以下内容整体替换 `electron/nodes/initNode.js`：

```js
const { getDb } = require("../db/db.cjs");
const { getDataPath } = require("../ipc/userPath.cjs");
const { purgeExpiredTrash } = require("../ipc/trash.cjs");
const { sweepUnreferencedAttachments } = require("../ipc/attachment.cjs");
const { scanNoteFiles, planReconcile } = require("./noteSync.cjs");
const fs = require('fs');

async function initNode() {
    const db = getDb();
    const storagePath = getDataPath();

    if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
    }

    // 顶层 .md 是唯一事实源：扫目录 → 与 SQL 双向对账（.delete/.data/attachment 天然跳过）
    const { notes, skipped } = scanNoteFiles(storagePath);
    const rows = db.prepare('SELECT id, name, alias, top, "left", content, "delete" FROM notes').all();
    const plan = planReconcile({ notes, skipped, rows });

    const now = new Date().toISOString();
    const insertStmt = db.prepare(`
        INSERT INTO notes (id, name, content, alias, top, "left", last_up_time, "delete")
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);
    const updateStmt = db.prepare(`
        UPDATE notes SET name = ?, alias = ?, top = ?, "left" = ?, content = ?, "delete" = 0, last_up_time = ?
        WHERE id = ?
    `);
    const deleteStmt = db.prepare('DELETE FROM notes WHERE id = ?');

    // 单事务：避免部分写入留下文件与库不一致的中间态
    db.transaction(() => {
        for (const n of plan.inserts) {
            insertStmt.run(n.id, n.name, n.content, n.alias, n.top, n.left, now);
        }
        for (const n of plan.updates) {
            updateStmt.run(n.name, n.alias, n.top, n.left, n.content, now, n.id);
        }
        for (const id of plan.removes) {
            deleteStmt.run(id);
        }
    })();

    for (const s of plan.skipped) console.warn(`[initNode] 跳过文件 ${s.file}: ${s.reason}`);
    for (const w of plan.warn) console.warn(`[initNode] ${w}`);
    console.log(`[initNode] ${storagePath} 扫描 ${notes.length} 个 .md；新增 ${plan.inserts.length}，修复/恢复 ${plan.updates.length}，删除 ${plan.removes.length}`);

    // 保留期清理与孤儿附件清理：失败不应阻断启动（main.cjs 的 catch 会 app.quit）
    try {
        console.log('Purged expired trash entries:', purgeExpiredTrash().purged);
    } catch (error) {
        console.error('purgeExpiredTrash failed:', error);
    }
    try {
        console.log('Swept unreferenced attachments:', sweepUnreferencedAttachments().removed);
    } catch (error) {
        console.error('sweepUnreferencedAttachments failed:', error);
    }
}

module.exports = { initNode };
```

- [ ] **Step 2: 确认调用点无需改动**

Run: `grep -rn "initNode" electron/main.cjs electron/ipc/settings.cjs`
Expected: `main.cjs:30`、`main.cjs:51`、`settings.cjs:45` 三处均为 `await initNode()`，签名与 `module.exports` 保持不变

- [ ] **Step 3: 语法检查**

Run: `node --check electron/nodes/initNode.js && node --check electron/nodes/noteSync.cjs`
Expected: 无输出（退出码 0）

- [ ] **Step 4: 提交**

```bash
git add electron/nodes/initNode.js
git commit -m "refactor(notes): initNode 改为扫目录与 SQL 双向对账"
```

---

### Task 5: 修 openFile 的文件缺失兜底

**Files:**
- Modify: `electron/ipc/file.cjs`（`findFileByNoteId` → `resolveFallbackFile`，改 `openFile` 的 catch 分支）

**Interfaces:**
- Consumes: `matter`、`fs/promises`、`path`（文件内已有）
- Produces: `resolveFallbackFile(dataPath, fileName) → Promise<string | null>`

**说明：本任务没有自动化测试**，原因同 Task 4（依赖 electron 运行时）。

- [ ] **Step 1: 替换兜底函数**

把 `electron/ipc/file.cjs:10-34` 的 `findFileByNoteId` 整体替换为：

```js
// 文件名格式恒为 `${id}-${title}.md`，而 id 自身可能含 '-'（如 zbysv-KrUE3M、Fe-9MDeqq4oD），
// 所以不能按 '-' 切分反推 id，只能拿 frontmatter 里的 id 去匹配文件名前缀。
async function resolveFallbackFile(dataPath, fileName) {
    const target = String(fileName || '');
    if (!target) {
        return null;
    }

    const entries = await fs.readdir(dataPath, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isFile() || path.extname(entry.name) !== '.md') {
            continue;
        }

        const candidatePath = path.join(dataPath, entry.name);
        try {
            const parsed = matter(await fs.readFile(candidatePath, 'utf-8'));
            const id = parsed.data?.id;
            if (id && target.startsWith(`${id}-`)) {
                return candidatePath;
            }
        } catch {
            continue;
        }
    }

    return null;
}
```

- [ ] **Step 2: 改 openFile 的 catch 分支**

把 `electron/ipc/file.cjs` 中这段：

```js
                const noteId = String(fileName || '').split('-')[0];
                const fallbackPath = await findFileByNoteId(dataPath, noteId);
```

替换为：

```js
                const fallbackPath = await resolveFallbackFile(dataPath, fileName);
```

- [ ] **Step 3: 确认没有残留引用**

Run: `grep -rn "findFileByNoteId\|split('-')\[0\]" electron/`
Expected: 无输出

- [ ] **Step 4: 语法检查**

Run: `node --check electron/ipc/file.cjs`
Expected: 无输出（退出码 0）

- [ ] **Step 5: 提交**

```bash
git add electron/ipc/file.cjs
git commit -m "fix(notes): openFile 兜底按 id 前缀匹配，支持 id 自带连字符"
```

---

### Task 6: 端到端手动验证

**Files:** 无代码改动。

**说明：** `initNode.js` 与 `file.cjs` 无自动化覆盖，本任务是本次变更唯一的端到端验证，必须真实启动应用完成。

- [ ] **Step 1: 备份真实存储目录**

Run: `cp -a /Users/exccedy/Documents/notes /tmp/notes-backup-$(date +%s)`
Expected: 退出码 0

- [ ] **Step 2: 记录改动前的基线**

Run:
```bash
sqlite3 /Users/exccedy/Documents/notes/.data \
  'select id, coalesce(top,"<NULL>") from notes where id="zbysv-KrUE3M";
   select count(*) from notes where content like "---%";
   select count(*) from notes;'
```
Expected: 第一行 `zbysv-KrUE3M|1.0`，第二行 `54`（记录实际值，供 Step 3 对比）

- [ ] **Step 3: 启动应用，确认脏数据被修复**

Run: `cd electron && pnpm dev`

在应用启动后重跑 Step 2 的查询。
Expected: `zbysv-KrUE3M|1`（不再是 `1.0`）、`content like '---%'` 计数为 `0`；日志出现 `[initNode] … 扫描 N 个 .md；新增 …，修复/恢复 …，删除 …`。脑图上「t」节点及其子节点出现。

- [ ] **Step 4: 验证新增文件（不带引号的数字 top）**

Run:
```bash
printf -- '---\nid: zzTest0001\ntitle: 外部新增\ntop: 1\nleft: ""\n---\nhello\n' \
  > /Users/exccedy/Documents/notes/zzTest0001-外部新增.md
sqlite3 /Users/exccedy/Documents/notes/.data "select top from notes where id='zzTest0001';"
```
Expected: 第一条命令前查询为空；重启应用后查询返回 `1`（不是 `1.0`），节点出现在根下

- [ ] **Step 5: 验证反向删除与子节点重挂**

Run:
```bash
mkdir -p /tmp/pn-moved && mv /Users/exccedy/Documents/notes/zbysv-KrUE3M-t.md /tmp/pn-moved/
sqlite3 /Users/exccedy/Documents/notes/.data "select count(*) from notes where id='zbysv-KrUE3M';"
```
Expected: 重启后返回 `0`（行已删），原属它的子节点出现在根节点下（日志有 `父节点不可达，重挂到根`）

- [ ] **Step 6: 验证软删恢复**

Run:
```bash
ls /Users/exccedy/Documents/notes/.delete | head -1
cp "/Users/exccedy/Documents/notes/.delete/$(ls /Users/exccedy/Documents/notes/.delete | grep '\.md$' | head -1)" /Users/exccedy/Documents/notes/
```
Expected: 重启后该笔记的 `delete` 为 0 且可见，日志有 `自动恢复`

- [ ] **Step 7: 验证空目录守门**

Run:
```bash
mkdir -p /tmp/pn-all-md && mv /Users/exccedy/Documents/notes/*.md /tmp/pn-all-md/
sqlite3 /Users/exccedy/Documents/notes/.data 'select count(*) from notes;'
```
Expected: 重启后行数与移出前一致（未被清空），日志出现 `跳过删除阶段`；随后 `mv /tmp/pn-all-md/*.md /Users/exccedy/Documents/notes/` 并再次重启，恢复正常

- [ ] **Step 8: 验证无 id 文件被报告**

Run:
```bash
printf -- '---\ntitle: 副业|测试\n---\n123\n' > /Users/exccedy/Documents/notes/HxaDLuXJ6CJ7-副业|测试.md
```
Expected: 重启后日志出现 `[initNode] 跳过文件 HxaDLuXJ6CJ7-副业|测试.md: frontmatter 缺少 id`，且 `select count(*) from notes where id='HxaDLuXJ6CJ7'` 为 `0`

- [ ] **Step 9: 干净目录与切目录回归**

Run: `./demo-data/install.sh /tmp/pn-sync-test zh`
然后在设置里把存储目录切到 `/tmp/pn-sync-test`。
Expected: 12 个节点全部显示；再切回真实目录，真实库内容正确，无重复行、无丢失

- [ ] **Step 10: 记录覆盖边界并提交验证结论**

在 `openspec/changes/fix-note-storage-sync/tasks.md` 里勾选已完成项，并确认第 5.9 项记录了「`initNode.js` / `file.cjs` 无自动化测试」这一覆盖边界。

```bash
git add openspec/changes/fix-note-storage-sync/tasks.md
git commit -m "docs(notes): 记录 fix-note-storage-sync 的验证结论与覆盖边界"
```

---

### Task 7: 修 promoteChildren 只改库不写文件 + 重挂落点改为最近可用祖先

**Files:**
- Modify: `electron/nodes/noteSync.cjs`（重挂目标）
- Modify: `electron/nodes/noteSync.test.cjs`（+3 用例）
- Modify: `web/src/pages/MindMap.jsx:587-601, 660`（`promoteChildren` 补写文件）

**Why:** 补验阶段用真实数据发现（详见 `design.md` 的「已修复的交互缺陷」）：App 删节点时 `promoteChildren` 只改数据库不写 `.md`，而本变更的对账以文件为准，于是陈旧的旧上级在下次启动时被当成真相，把子节点一路挪走。实测 7 个节点由「探索」下被甩到根节点。

**Interfaces:**
- Consumes: `db.notes.select({ top })`、`window.api.updateYaml(fileName, yamlData)`（渲染侧已有 API，`executeMoveNode` 就是这么用的）
- Produces: `promoteChildren(parentId, grandParentId)` 变为 `async`，须 `await`

- [ ] **Step 1: 重挂目标改为最近可见祖先**

把 `noteSync.cjs` 中 `planReconcile` 的重挂循环替换为：

```js
  const rootNote = survivors.find((n) => n.top === ROOT_TOP);
  const rootId = rootNote ? rootNote.id : (visibleIds.has(ROOT_ID) ? ROOT_ID : null);

  // 沿 DB 的 top 链上溯，返回第一个可见祖先（可穿过已软删/已失踪的父节点）。
  // 不直接挂根：App 删节点时把子节点提升到「上一级」（MindMap.jsx 的 promoteChildren），
  // 只有落到同一个祖先上才与 App 的语义一致；一路掉到根会把节点从原来的位置甩走。
  const nearestVisibleAncestor = (startId) => {
    let current = startId;
    const seen = new Set();
    while (current && !seen.has(current)) {
      if (visibleIds.has(current)) return current;
      seen.add(current);
      const parentRow = rowById.get(current);
      current = parentRow ? parentRow.top : null;
    }
    return null;
  };

  for (const note of survivors) {
    if (note.id === rootId) continue;
    if (note.top === ROOT_TOP) continue;
    if (note.top && visibleIds.has(note.top)) continue;
    const target = (note.top && nearestVisibleAncestor(note.top)) || rootId;
    if (!target) {
      warn.push(`根节点不可用，跳过重挂: ${note.id} (top=${note.top ?? 'null'})`);
      continue;
    }
    const where = target === rootId ? '根' : '最近可用祖先';
    warn.push(`父节点不可达，重挂到${where}: ${note.id} (top=${note.top ?? 'null'} -> ${target})`);
    note.top = target;
  }
```

- [ ] **Step 2: 补 3 个测试**

在 `noteSync.test.cjs` 追加（`seen` 集合保证成环不死循环）：

```js
test('planReconcile 父节点在回收站时重挂到最近的可见祖先，而不是根', () => {
  const plan = planReconcile({
    notes: [rootNote(), note({ id: 'gp', top: '1' }), note({ id: 'c', top: 'trashed' })],
    rows: [
      rootRow(),
      row({ id: 'gp', top: '1' }),
      row({ id: 'trashed', top: 'gp', delete: 1 }),
      row({ id: 'c', top: 'trashed' }),
    ],
  });
  assert.equal(plan.updates.find((n) => n.id === 'c').top, 'gp');
  assert.ok(plan.warn.some((w) => /重挂到最近可用祖先/.test(w)));
});

test('planReconcile 可穿过多层已删除父节点上溯', () => {
  const plan = planReconcile({
    notes: [rootNote(), note({ id: 'c', top: 't2' })],
    rows: [rootRow(), row({ id: 't1', top: '1', delete: 1 }), row({ id: 't2', top: 't1', delete: 1 })],
  });
  assert.equal(plan.inserts.find((n) => n.id === 'c').top, '1');
});

test('planReconcile 祖先链成环时不死循环，回退到根', () => {
  const plan = planReconcile({
    notes: [rootNote(), note({ id: 'c', top: 't1' })],
    rows: [rootRow(), row({ id: 't1', top: 't2', delete: 1 }), row({ id: 't2', top: 't1', delete: 1 })],
  });
  assert.equal(plan.inserts.find((n) => n.id === 'c').top, '1');
});
```

- [ ] **Step 3: 让 promoteChildren 同时写文件**

把 `web/src/pages/MindMap.jsx` 的 `promoteChildren` 替换为（数据库语义与原来完全一致，只增写文件）：

```js
  // 将子节点提升到祖父节点下。
  // 数据库和 .md 文件都要改：启动对账以文件为准（见 electron/nodes/noteSync.cjs），
  // 只改库会让文件里那个已经不存在的旧上级在下次启动时被当成真相，
  // 这些节点会被一路挪到别的父节点底下。
  const promoteChildren = async (parentId, grandParentId) => {
    const children = await db.notes.select({ top: parentId });

    // 更新所有直接子节点的 top 为 grandParentId
    await db.notes.update({ top: parentId }, { top: grandParentId });
    for (const child of children) {
      await window.api.updateYaml(`${child.id}-${child.name}.md`, { top: grandParentId });
    }

    // 更新 notesData 状态
    setNotesData(nds => nds.map(n => {
      if (n.top === parentId) {
        return { ...n, top: grandParentId };
      }
      return n;
    }));
  };
```

- [ ] **Step 4: 调用点改为 await**

在 `confirmDelete` 的 `else` 分支：

```js
      const grandParentId = deleteConfirmation.grandParentId;
      await promoteChildren(deleteConfirmation.id, grandParentId);
      await _internalDeleteNode(deleteConfirmation.id);
```

- [ ] **Step 5: 验证**

```bash
node --check electron/nodes/noteSync.cjs
node --test electron/nodes/noteSync.test.cjs          # 期望 21 passed
cd web && npx eslint src/pages/MindMap.jsx            # 期望无新增问题（仅既有 2 处 no-unused-vars）
```

副本端到端复验（不碰真实数据）：把真实存储目录 `cp -a` 到 `/tmp`，跑一次对账，确认被删父节点的子节点**保持**在原祖父节点下、且对该批节点产生 0 条 UPDATE。

- [ ] **Step 6: 提交**

```bash
git add electron/nodes/noteSync.cjs electron/nodes/noteSync.test.cjs web/src/pages/MindMap.jsx
git commit -m "fix(notes): 删节点时同步写文件，对账重挂改为最近可用祖先"
```

