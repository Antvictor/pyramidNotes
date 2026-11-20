// 方向键导航目标计算：输入节点图（children 顺序即 sort 顺序）与当前展示子树根，
// 输出上/左/右/下四个方向的候选节点 id（无候选为 null）。
export function getNavigationTargets({ selectedId, nodeMap, displayRootId, getCenterX }) {
  const empty = { up: null, left: null, right: null, down: null };
  if (!nodeMap || !displayRootId) return empty;

  const node = nodeMap.get(selectedId);
  if (!node) return empty;

  const inDisplay = (id) => {
    let current = nodeMap.get(id);
    const visited = new Set();
    while (current && !visited.has(current.id)) {
      if (current.id === displayRootId) return true;
      visited.add(current.id);
      if (!current.top || current.top === '0' || !nodeMap.has(current.top)) return false;
      current = nodeMap.get(current.top);
    }
    return false;
  };

  const result = { ...empty };
  const parent = node.top && node.top !== '0' && nodeMap.has(node.top)
    ? nodeMap.get(node.top)
    : null;

  if (parent && inDisplay(parent.id)) result.up = parent.id;

  const siblings = parent?.children || [];
  const index = siblings.findIndex((c) => c.id === node.id);
  if (index > 0 && inDisplay(siblings[index - 1].id)) result.left = siblings[index - 1].id;
  if (index >= 0 && index < siblings.length - 1 && inDisplay(siblings[index + 1].id)) {
    result.right = siblings[index + 1].id;
  }

  const children = node.children || [];
  if (children.length) {
    let chosen = children[Math.floor((children.length - 1) / 2)];
    const parentCenter = typeof getCenterX === 'function' ? getCenterX(node.id) : null;
    if (parentCenter !== null && parentCenter !== undefined) {
      let best = Infinity;
      for (const child of children) {
        const center = getCenterX(child.id);
        if (center === null || center === undefined) continue;
        const distance = Math.abs(center - parentCenter);
        if (distance < best) {
          best = distance;
          chosen = child;
        }
      }
    }
    if (inDisplay(chosen.id)) result.down = chosen.id;
  }

  return result;
}
