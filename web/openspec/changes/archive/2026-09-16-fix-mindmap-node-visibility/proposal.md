## Why

脑图用两个**互相独立、且会互相矛盾**的状态控制显示：

- `loadedNodeIds`（`mindMapViewStore`）— 可见性硬过滤：`displayedNotes` 只保留命中该集合的节点
- `expandedNodeIds` — 节点是否展开

二者之间**没有任何一致性约束**，可以出现「节点被标记为已展开、但它的子节点并未加载」的矛盾状态。
任何改数据的流程只要忘了同步 `loadedNodeIds`，节点就会"存在但不显示"，必须折叠再展开才恢复。

已复现两个 bug：

1. 在编辑页创建子节点（编辑器"提取节点"路径）后返回脑图，新子节点**不显示**
2. 搜索并打开一个子节点后，其**兄弟节点不显示**，而父节点却显示为"已展开"

此外，聚焦模式存在同类问题：聚焦会把树以该节点为重根重排到布局原点，但**视口不跟随**，
导致原本靠左/靠右的节点移出屏幕，需要手动挪动画布才能找到。

## What Changes

- **新增** 不变量「已展开 ⇒ 子节点已加载」，用一个协调 effect 自动维护
- **新增** 纯函数 `collectExpandedChildren`（含单测）
- **修复** `Node.jsx` 建节点后揭示父链，且统一由 `createChildFromSelection` 负责（移除 `handleNewChild` 中的重复实现）
- **修复** 进入/退出聚焦模式后视口跟随重排，避免节点移出屏幕

## Capabilities

### Modified Capabilities
- `mindmap-view`：可见性与展开状态保持一致；聚焦切换时视口跟随

## Impact

- **代码**：`web/src/pages/treeUtils.js`、`web/src/pages/treeUtils.test.js`、
  `web/src/pages/MindMap.jsx`、`web/src/pages/note/Node.jsx`
