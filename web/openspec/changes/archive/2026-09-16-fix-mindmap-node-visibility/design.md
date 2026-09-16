## Context

可见性完全由 `loadedNodeIds` 决定：

```
displayedNotes = pool.filter(n => loadedNodeIds.has(n.id))
```

而 `expandOneLevel` / `collapseNode` / `revealNodeIds` / `handleRevealNode` 以及各个"新建节点"流程
**各自手工维护** `loadedNodeIds`，任何一处漏掉就会出现"存在但不显示"。

## Goals / Non-Goals

**Goals:**
- 消除"已展开却看不到子节点/兄弟"的矛盾状态
- 新建节点返回脑图后立即可见
- 聚焦切换后节点不丢失

**Non-Goals:**
- 不把 `loadedNodeIds` 重构为从 `expandedNodeIds` 派生的集合（改动面大、风险高）
- 不取消懒加载（整棵树始终全量显示会在树大时带来性能/可读性问题）
- 不重构 `revealNodeIds` 的 store 语义

## Decisions

- **以不变量代替逐流程打补丁**：确立 `expanded ⇒ 子节点已加载`，并自动维护。
  这样问题 2（搜索后兄弟不显示）与问题 1 的"父已展开"情形都由不变量覆盖，未来新增流程也不会重踩
- **不变量放在 `MindMap` 的 effect**，依赖 `expandedNodeIds` + `allNotesNodeMap`：
  数据变化时自动重跑补齐；无变化返回原引用让 React bail out；依赖不含 `loadedNodeIds` 避免自循环
- **effect 必须放在 `allNotesNodeMap` 定义之后**：依赖数组在渲染时求值，放前面会因 `const` TDZ 报错
- **首屏不受影响**：初始加载 effect 会 `setExpandedNodeIds(new Set())`，没有 expanded 节点 → 不变量空转
- **建节点时统一揭示**：`createChildFromSelection` 负责 `revealNodeIds`，`handleNewChild` 不再重复
- **聚焦后视口跟随**：聚焦会重根重排到布局原点，用既有的 `centerWhenRendered()` 把视口带过去
