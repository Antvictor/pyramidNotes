## 1. 可见性不变量

- [x] 1.1 `treeUtils.js` 新增纯函数 `collectExpandedChildren(expandedIds, nodeMap)` + 5 个单测
- [x] 1.2 `MindMap.jsx` 新增不变量协调 effect（置于 `allNotesNodeMap` 之后，避开依赖数组 TDZ）
- [x] 1.3 `Node.jsx` 在 `createChildFromSelection` 末尾补 `revealNodeIds`；移除 `handleNewChild` 中重复的 reveal

## 2. 聚焦模式视口跟随

- [x] 2.1 「聚焦模式」按钮：`setFocusNodeId` 后调用 `centerWhenRendered()`
- [x] 2.2 「全局模式」按钮：同样在重排后 `centerWhenRendered()`

## 3. 验证

- [x] 3.1 `npx vitest run --environment node src/pages/treeUtils.test.js` → 9/9 通过
- [x] 3.2 全量非-DOM 测试（treeUtils/db/i18n/deleteNodeRequest/mindMapViewStore）→ 36/36 通过
- [x] 3.3 `npx vite build` 通过；`eslint` 无新增 error（仅剩 2 个既有 error）
- [x] 3.4 手动：编辑器建子节点立即可见（父展开/未展开两种）、搜索后兄弟全部显示、
  聚焦/回到全局视口跟随、折叠/展开与删除正常、无回归
