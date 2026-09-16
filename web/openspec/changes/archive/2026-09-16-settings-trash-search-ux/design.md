## Context

三处独立改动，其中两处有值得记录的根因与取舍。

## Goals / Non-Goals

**Goals:**
- 数字输入可以自由清空、逐位编辑，不会被强制写回
- 回收站内可多选**物理删除**
- 全文搜索可用快捷键直达，并在弹窗内切 tab
- 快捷键默认值只有一处权威来源

**Non-Goals:**
- 不为老用户做设置迁移（开发阶段，允许重置 settings.json）
- 不为「移动目标」那处搜索弹窗接入 tab 逻辑（用途不同）
- 不重构 `loadedNodeIds` 之类的既有视图状态

## Decisions

- **数字输入：清空后回到「原值」而不是「默认值」** —— 这是与原 bug 的关键差别。
  `max` 为可选（保留期无上限，两个字号 12–32）；回车不单独提交，而是 `blur()` 走同一条提交路径，避免两条逻辑分叉。
- **回收站彻底删除：新 IPC `purgeTrashNodes`，无条件物理删除** —— 不复用按 `settings.deleteMode`
  分支的 `deleteNotes`。复用 `trashUtils.collectCluster` 取**整簇**（顶层 + 其 `"delete"=1` 后代），
  否则会在回收站留下孤儿。只处理 `"delete"=1` 的行（防御）。
- **快捷键单一来源：load 与 save 都要深合并** —— 只修 `loadSettings` 不够：
  「重置」会传 `{ shortcuts: {} }` 并期望立刻从 `getSettings()` 拿到完整默认值，所以 `saveSettings`
  也必须经 `mergeShortcuts` 归一化后再写入与缓存。
- **搜索 tab 改为受控**：`NodeSearchDialog` 的 `activeTab` 由页面持有（`activeTab` + `onActiveTabChange`，
  不传时退回内部 state）。
  ⚠️ 搜索键的判断**必须放在 `searchOpen` 提前返回之前** —— 否则"弹窗已打开 → 切 tab"永远不会触发。
- **`App.jsx` 的 Ctrl+K 是死代码，不是配置失效 bug**：`MindMap` 的签名从未接收 `searchOpen` props，
  它和 `Node.jsx` 各自有**读配置**的按键处理。本次顺手删除以消除误导。
