const ROOT_TOP = '0';

function isRoot(row) {
  return !!row && row.top === ROOT_TOP;
}

// ids: string[]; rowsById: Map<id, row>。返回剔除根后的 id（未知 id 保留，交由上层忽略）
function filterDeletableIds(ids, rowsById) {
  return ids.filter((id) => {
    const r = rowsById.get(id);
    return r ? !isRoot(r) : true;
  });
}

// 以 boundaryId 为根，BFS 收集其自身 + 所有 delete=1 的后代
function collectCluster(boundaryId, rows) {
  const deleted = rows.filter((r) => Number(r.delete) === 1);
  const childrenByParent = new Map();
  for (const r of deleted) {
    if (!childrenByParent.has(r.top)) childrenByParent.set(r.top, []);
    childrenByParent.get(r.top).push(r.id);
  }
  const out = [];
  const seen = new Set();
  const stack = [boundaryId];
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    for (const c of childrenByParent.get(id) || []) stack.push(c);
  }
  return out;
}

// 回收站顶层 = delete=1 且父节点不是 delete=1（父缺失或父未删都算顶层）
function listTrashBoundaries(rows) {
  const deleted = rows.filter((r) => Number(r.delete) === 1);
  const deletedIds = new Set(deleted.map((r) => r.id));
  return deleted.filter((r) => !deletedIds.has(r.top));
}

function isExpired(lastUpTime, days, nowMs) {
  if (!lastUpTime) return false;
  const d = Number(days);
  if (!d || d <= 0) return false;
  return new Date(lastUpTime).getTime() < nowMs - d * 86400000;
}

module.exports = { ROOT_TOP, isRoot, filterDeletableIds, collectCluster, listTrashBoundaries, isExpired };
