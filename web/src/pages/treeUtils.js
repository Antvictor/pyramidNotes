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

// 移动节点：当前 sort 不大于目标父下兄弟最大值时，需要抬升以保证落在最右
export function needsSortBump(currentSort, siblingMax) {
  return (Number(currentSort) || 0) <= (Number(siblingMax) || 0);
}

// 仅同父兄弟可交换；根节点（top === '0'）无父级，不可交换
export function canSwapNodes(source, target) {
  return !!source && !!target
    && source.id !== target.id
    && source.top != null
    && source.top === target.top
    && source.top !== '0';
}

// a、b 为 DB 最新行（含 id、sort）：交换二者 sort 后按 sort 稳定重排
export function applySwapSorts(notes, a, b) {
  if (!notes || !a || !b) return notes;
  const aSort = Number(a.sort) || 0;
  const bSort = Number(b.sort) || 0;
  const next = notes.map(n => (
    n.id === a.id ? { ...n, sort: bSort } : n.id === b.id ? { ...n, sort: aSort } : n
  ));
  next.sort((x, y) => (Number(x.sort) || 0) - (Number(y.sort) || 0));
  return next;
}

// 交换位置弹窗：空关键词列出全部兄弟，否则按名称包含过滤（不区分大小写）
export function filterSiblingsByName(siblings, keyword) {
  const kw = String(keyword || "").trim().toLowerCase();
  if (!kw) return siblings;
  return siblings.filter((s) => String(s.name || "").toLowerCase().includes(kw));
}

// 从 rootId 出发、最多 maxDepth 层的可见 id 集合（含 root）。
// 首帧渲染与初始化 effect 共用，保证「首帧可见集合 == 初始化后集合」；
// 不可达节点（父不存在或不在传入集合内）不计入。
export function collectVisibleIdsToDepth(nodes, rootId, maxDepth = 2) {
  const ids = new Set();
  if (!Array.isArray(nodes) || !rootId) return ids;

  const known = new Set();
  const childrenByParent = new Map();
  for (const node of nodes) {
    if (!node) continue;
    known.add(node.id);
    if (node.top && node.top !== '0') {
      const list = childrenByParent.get(node.top);
      if (list) list.push(node.id);
      else childrenByParent.set(node.top, [node.id]);
    }
  }
  if (!known.has(rootId)) return ids;

  ids.add(rootId);
  let frontier = [rootId];
  for (let depth = 0; depth < maxDepth && frontier.length; depth += 1) {
    const next = [];
    for (const id of frontier) {
      for (const childId of childrenByParent.get(id) || []) {
        if (ids.has(childId)) continue;
        ids.add(childId);
        next.push(childId);
      }
    }
    frontier = next;
  }
  return ids;
}
