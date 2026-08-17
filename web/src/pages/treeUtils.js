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
