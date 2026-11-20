export function getActiveEdgeIds({ selectedId, nodeMap }) {
  const ids = new Set();
  if (!selectedId || !nodeMap?.has(selectedId)) return ids;

  let cur = nodeMap.get(selectedId);
  const seen = new Set();
  while (cur && cur.top && cur.top !== "0" && nodeMap.has(cur.top) && !seen.has(cur.id)) {
    seen.add(cur.id);
    ids.add(`e${cur.top}-${cur.id}`);
    cur = nodeMap.get(cur.top);
  }

  return ids;
}
