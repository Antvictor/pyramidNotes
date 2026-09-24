const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const matter = require('gray-matter');
const {
  ROOT_ID, normalizeFields, isProtectedRoot, scanNoteFiles, planReconcile, writeNoteTop,
} = require('./noteSync.cjs');

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

test('scanNoteFiles 读一批带引号 frontmatter 的文件（含自定义根 id）', () => {
  // demo-data/ 与 openspec/specs 一样被 .git/info/exclude 排除，不是仓库资源，
  // 所以夹具在这里现造，保证新克隆上也能通过。
  const dir = tmpDir();
  write(dir, 'root-os.md', '---\nid: "zho01root001"\nname: "操作系统"\nalias: ""\ntop: "0"\nleft: ""\n---\n\n# 操作系统\n');
  for (let i = 1; i <= 11; i += 1) {
    write(dir, `n${i}.md`, `---\nid: "zho${String(i).padStart(2, '0')}leaf0001"\nname: "节点${i}"\nalias: ""\ntop: "zho01root001"\nleft: ""\n---\n\n正文${i}\n`);
  }

  const { notes, skipped } = scanNoteFiles(dir);
  assert.equal(notes.length, 12);
  assert.deepEqual(skipped, []);
  const root = notes.find((n) => n.id === 'zho01root001');
  assert.equal(root.top, '0');
  assert.equal(root.name, '操作系统');
  assert.ok(notes.every((n) => typeof n.top === 'string' && typeof n.content === 'string'));
  assert.ok(notes.every((n) => !n.content.startsWith('---')));
  // 自定义根 id 下所有子节点都可达
  const plan = planReconcile({ notes, rows: [] });
  assert.equal(plan.inserts.length, 12);
  assert.deepEqual(plan.warn, []);
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

test('planReconcile 把重挂结果登记为待回写的文件', () => {
  const plan = planReconcile({
    notes: [
      rootNote(),
      note({ id: 'gp', top: '1', file: 'gp-祖父.md' }),
      note({ id: 'c', top: 'trashed', file: 'c-子.md' }),
    ],
    rows: [
      rootRow(),
      row({ id: 'gp', top: '1' }),
      row({ id: 'trashed', top: 'gp', delete: 1 }),
      row({ id: 'c', top: 'trashed' }),
    ],
  });
  assert.deepEqual(plan.reattached, [{ file: 'c-子.md', id: 'c', top: 'gp' }]);
});

test('writeNoteTop 只改 top，保留其余 frontmatter 与正文', () => {
  const dir = tmpDir();
  const file = path.join(dir, 'n-标题.md');
  fs.writeFileSync(file, '---\nid: n\ntitle: 标题\nalias: "a"\ntop: gone\nleft: ""\n---\n正文\n', 'utf-8');

  writeNoteTop(file, '1');

  const parsed = matter(fs.readFileSync(file, 'utf-8'));
  assert.equal(parsed.data.top, '1');
  assert.equal(parsed.data.id, 'n');
  assert.equal(parsed.data.title, '标题');
  assert.equal(parsed.data.alias, 'a');
  assert.match(parsed.content, /正文/);
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
