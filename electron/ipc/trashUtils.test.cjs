const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isRoot, filterDeletableIds, collectCluster, listTrashBoundaries, isExpired,
} = require('./trashUtils.cjs');

const row = (id, top, del) => ({ id, name: id, top, delete: del });

test('isRoot true only when top is 0', () => {
  assert.equal(isRoot(row('1', '0', 0)), true);
  assert.equal(isRoot(row('2', '1', 0)), false);
  assert.equal(isRoot(undefined), false);
});

test('filterDeletableIds drops root, keeps others', () => {
  const byId = new Map([['1', row('1', '0', 0)], ['2', row('2', '1', 0)]]);
  assert.deepEqual(filterDeletableIds(['1', '2'], byId), ['2']);
});

test('collectCluster gathers boundary + deleted descendants', () => {
  // 整树删除：A(删) -> B(删) -> C(删)；边界 A
  const rows = [row('A', 'root', 1), row('B', 'A', 1), row('C', 'B', 1)];
  assert.deepEqual(collectCluster('A', rows).sort(), ['A', 'B', 'C']);
});

test('collectCluster on single-node delete returns only itself', () => {
  // 单节点删除：X(删)，其子 Y 已上移且未删
  const rows = [row('X', 'root', 1), row('Y', 'root', 0)];
  assert.deepEqual(collectCluster('X', rows), ['X']);
});

test('listTrashBoundaries returns deleted nodes whose parent is not deleted', () => {
  const rows = [
    row('A', 'root', 1),   // 边界
    row('B', 'A', 1),      // 非边界（父 A 也删）
    row('X', 'root', 1),   // 边界
    row('Y', 'root', 0),   // 未删，忽略
  ];
  assert.deepEqual(listTrashBoundaries(rows).map((r) => r.id).sort(), ['A', 'X']);
});

test('isExpired respects days and null', () => {
  const now = Date.parse('2026-09-15T00:00:00.000Z');
  const old = new Date(now - 40 * 86400000).toISOString();
  const recent = new Date(now - 10 * 86400000).toISOString();
  assert.equal(isExpired(old, 30, now), true);
  assert.equal(isExpired(recent, 30, now), false);
  assert.equal(isExpired(null, 30, now), false);
  assert.equal(isExpired(old, 0, now), false);
});
