export function computeAncestorChain(nodeId, displayRootId, nodeMap) {
  const chain = [];
  const visited = new Set();
  let current = nodeMap.get(nodeId);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    chain.push(current.id);
    if (current.id === displayRootId) break;
    if (current.top === '0' || !nodeMap.has(current.top)) break;
    current = nodeMap.get(current.top);
  }
  return chain;
}

// 已展开节点的子节点集合（不变量：已展开 ⇒ 子节点必须已加载）
export function collectExpandedChildren(expandedIds, nodeMap) {
  const ids = new Set();
  for (const id of expandedIds) {
    const node = nodeMap.get(id);
    if (!node) continue;
    for (const child of node.children || []) ids.add(child.id);
  }
  return ids;
}
