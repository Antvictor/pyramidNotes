const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const yaml = require('yaml');
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
      notes.push({ ...fields, content: parsed.content, file });
    } catch (error) {
      skipped.push({ file, reason: error.message });
    }
  }
  return { notes, skipped };
}

// 根行保护：不看 top 单字段，因为历史 bug 已把根行 top 写成 NULL
function isProtectedRoot(row) {
  return !!row && (String(row.id) === ROOT_ID || row.top === ROOT_TOP);
}

// 把修正后的 top 写回文件，保留其余 frontmatter 与正文。
// 与 file.cjs 的 updateYaml 同语义：那里是渲染侧改一个节点，这里是启动对账修正一批陈旧文件。
// 不回写的话，文件里那个不可达的旧上级会每次启动都被重新判一次（幂等但一直在刷告警）。
function writeNoteTop(filePath, top) {
  const parsed = matter(fs.readFileSync(filePath, 'utf-8'));
  const merged = {
    ...(parsed.data && typeof parsed.data === 'object' ? parsed.data : {}),
    top,
  };
  fs.writeFileSync(filePath, `---\n${yaml.stringify(merged).trim()}\n---\n${parsed.content}`, 'utf-8');
}

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
  const reattached = [];
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
    if (note.file) reattached.push({ file: note.file, id: note.id, top: target });
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

  return { inserts, updates, removes, skipped, warn, reattached };
}

module.exports = {
  ROOT_ID, normalizeFields, isProtectedRoot, scanNoteFiles, planReconcile, writeNoteTop,
};
