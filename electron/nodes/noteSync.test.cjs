const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const matter = require('gray-matter');
const {
  ROOT_ID, normalizeFields, isProtectedRoot, isDataless, planReconcile, writeNoteTop,
} = require('./noteSync.cjs');

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

test('normalizeFields 把 sort 规整为整数，缺省为 0', () => {
  assert.equal(normalizeFields({ id: 'a' }).sort, 0);
  assert.equal(normalizeFields({ id: 'a', sort: 5 }).sort, 5);
  assert.equal(normalizeFields({ id: 'a', sort: '7' }).sort, 7);
  assert.equal(normalizeFields({ id: 'a', sort: 3.9 }).sort, 3);
  assert.equal(normalizeFields({ id: 'a', sort: 'x' }).sort, 0);
});

test('normalizeFields 解析并规整 category', () => {
  assert.equal(normalizeFields({ id: 'a', category: 'gray' }).category, 'gray');
  assert.equal(normalizeFields({ id: 'a', category: '' }).category, null);
  assert.equal(normalizeFields({ id: 'a' }).category, null);
});

test('isDataless 仅在 macOS 把「有大小但零块」判定为未下载', () => {
  assert.equal(isDataless({ size: 100, blocks: 0 }), process.platform === 'darwin');
  assert.equal(isDataless({ size: 100, blocks: 8 }), false);
  assert.equal(isDataless({ size: 0, blocks: 0 }), false);
});

test('isProtectedRoot 同时认定 id 为 1 与 top 为 0 的行', () => {
  assert.equal(ROOT_ID, '1');
  assert.equal(isProtectedRoot({ id: '1', top: null }), true);
  assert.equal(isProtectedRoot({ id: 'x', top: '0' }), true);
  assert.equal(isProtectedRoot({ id: '9.9', top: '1' }), false);
  assert.equal(isProtectedRoot(undefined), false);
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
  assert.deepEqual(plan.availabilityMarks, []);
  assert.equal('removes' in plan, false); // 对账不再硬删
});

test('planReconcile 在 category/sort 不一致时更新，一致时不更新', () => {
  const diff = planReconcile({
    notes: [rootNote(), note({ id: 'n1', top: '1', category: 'gray', sort: 3 })],
    rows: [rootRow(), row({ id: 'n1', top: '1', category: null, sort: 1 })],
  });
  assert.deepEqual(diff.updates.map((n) => n.id), ['n1']);
  assert.equal(diff.updates[0].category, 'gray');

  const same = planReconcile({
    notes: [rootNote(), note({ id: 'n1', top: '1', category: 'gray', sort: 3 })],
    rows: [rootRow(), row({ id: 'n1', top: '1', category: 'gray', sort: 3 })],
  });
  assert.deepEqual(same.updates, []);
});

test('planReconcile 修复脏行：top 1.0 与带 frontmatter 的 content', () => {
  const plan = planReconcile({
    notes: [rootNote(), note({ id: 'z', top: '1', content: '正文' })],
    rows: [rootRow(), row({ id: 'z', top: '1.0', content: '---\nid: z\n---\n正文' })],
  });
  assert.deepEqual(plan.updates.map((n) => n.id), ['z']);
  assert.equal(plan.updates[0].top, '1');
  assert.equal(plan.updates[0].content, '正文');
});

test('planReconcile 恢复回到目录的软删笔记', () => {
  const plan = planReconcile({
    notes: [rootNote(), note({ id: 'z', top: '1' })],
    rows: [rootRow(), row({ id: 'z', top: '1', delete: 1 })],
  });
  assert.deepEqual(plan.updates.map((n) => n.id), ['z']);
  assert.ok(plan.warn.some((w) => /自动恢复/.test(w)));
});

test('planReconcile 缺失的行标记 missing，不硬删', () => {
  const plan = planReconcile({
    notes: [rootNote()],
    rows: [rootRow(), row({ id: 'orphan', top: '1' })],
  });
  assert.equal('removes' in plan, false);
  assert.ok(plan.availabilityMarks.some((m) => m.id === 'orphan' && m.availability === 'missing'));
});

test('planReconcile 存储不可用时不标记缺失、不重挂', () => {
  const plan = planReconcile({
    notes: [],
    rows: [rootRow(), row({ id: 'orphan', top: '1' })],
    storageUnavailable: true,
  });
  assert.deepEqual(plan.availabilityMarks, []);
  assert.deepEqual(plan.reattachments, []);
  assert.ok(plan.warn.some((w) => /存储不可用/.test(w)));
});

test('planReconcile 读不到(unreadable)标记 unavailable，且不把其子节点重挂走', () => {
  const plan = planReconcile({
    notes: [rootNote(), note({ id: 'c', top: 'cloudparent', file: 'c-子.md' })],
    unreadable: [{ id: 'cloudparent', file: 'x-行为.md', reason: 'not_downloaded' }],
    rows: [rootRow(), row({ id: 'cloudparent', top: '1' }), row({ id: 'c', top: 'cloudparent' })],
  });
  assert.equal('removes' in plan, false);
  assert.equal(plan.updates.length, 0);
  assert.equal(plan.reattachments.length, 0);
  const m = plan.availabilityMarks.find((x) => x.id === 'cloudparent');
  assert.equal(m.availability, 'unavailable');
  assert.equal(m.reason, 'not_downloaded');
});

test('planReconcile 未变(unchanged)的行把可用性拉回 available（仅当此前不同）', () => {
  const plan = planReconcile({
    notes: [rootNote()],
    unchanged: [{ id: 'n1', file: 'n1-N.md' }],
    rows: [rootRow(), row({ id: 'n1', top: '1', availability: 'unavailable', availability_reason: 'not_downloaded' })],
  });
  const m = plan.availabilityMarks.find((x) => x.id === 'n1');
  assert.equal(m.availability, 'available');
  assert.equal(m.reason, null);

  const same = planReconcile({
    notes: [rootNote()],
    unchanged: [{ id: 'n1', file: 'n1-N.md' }],
    rows: [rootRow(), row({ id: 'n1', top: '1', availability: 'available' })],
  });
  assert.equal(same.availabilityMarks.some((x) => x.id === 'n1'), false);
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
      note({ id: 'gp', top: '1' }),
      note({ id: 'c', top: 'trashed', file: 'c-子.md' }),
    ],
    rows: [
      rootRow(),
      row({ id: 'gp', top: '1' }),
      row({ id: 'trashed', top: 'gp', delete: 1 }),
      row({ id: 'c', top: 'trashed' }),
    ],
  });
  assert.deepEqual(plan.reattachments, [{ file: 'c-子.md', id: 'c', top: 'gp' }]);
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

test('writeNoteTop 只改 top，保留其余 frontmatter 与正文', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pn-sync-'));
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
