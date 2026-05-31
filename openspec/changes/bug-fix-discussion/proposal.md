# Bug Fix Discussion

> This change serves as a container for bug collection and discussion. Each bug will be fixed in its own sub-change once the discussion is complete.

## Why

Multiple bugs have been identified in the pyramidNotes application that affect user experience:
1. Keyboard shortcuts not working when no node is selected
2. `db.notes.count` is not a function errors causing crashes
3. Node rename dialog not updating with latest name
4. Selection state being lost unexpectedly after operations

## What Changes

This change contains bug discussions. Each bug below will be addressed in a separate sub-change once the discussion is complete.

### Bug List (to be discussed)

| # | Bug | Status |
|---|-----|--------|
| 1 | Ctrl+N 快捷键在无选中节点时没反应 | 🔄 Plan Generated |
| 2 | Delete 快捷键报错 `db.notes.count is not a function` | 🔄 Plan Generated |
| 3 | 右键删除节点报错 `db.notes.count is not a function` | 🔄 Plan Generated (与 Bug 2 共用同一修复) |
| 4 | F2 修改节点名称没有实时更新 | 🔄 Plan Generated |
| 5 | 修改后会取消选中状态 | Pending |

### Bug Details

#### Bug 1: Ctrl+N 快捷键在无选中节点时没反应

**描述**: 当没有选中任何节点时，按 Ctrl+N 没有任何反应。

**期望行为**: 应该创建根节点（parentId = "1"）

**根因**: `MindMap.jsx:152` 的守卫 `if (!selectedNode || !shortcuts) return;` 导致没有选中节点时直接返回，Ctrl+N 检查无法执行。

**修复方案**: 移除 common guard 中的 `!selectedNode`，为 F2 和 Delete 添加单独的守卫。

**讨论状态**: 🔄 Plan Generated → `docs/superpowers/plans/2026-05-31-fix-ctrl-n-no-selection.md`

---

#### Bug 2: Delete 快捷键报错 `db.notes.count is not a function`

**描述**: 按 Delete 键删除节点时报错：
```
MindMap.jsx:250 Uncaught TypeError: db.notes.count is not a function
    at requestDeleteNode (MindMap.jsx:250:33)
    at handler (MindMap.jsx:169:9)
```

**期望行为**: 应该正确检测子节点数量并弹出删除确认对话框

**根因**: `db.notes.count()` 方法不存在于 `Table` 类中

**修复方案**:
1. 在 `Table` 类中添加 `count(whereClause)` 方法
2. 修复 `requestDeleteNode` 中的 API 调用（`.where().run()` 链式调用是错误的）

**讨论状态**: 🔄 Plan Generated → `docs/superpowers/plans/2026-05-31-fix-db-notes-count.md`

---

#### Bug 3: 右键删除节点报错 `db.notes.count is not a function`

**描述**: 右键点击删除节点时报错：
```
MindMap.jsx:250 Uncaught TypeError: db.notes.count is not a function
    at onClick (ContextMenu.jsx:32:57)
```

**期望行为**: 应该与 Delete 快捷键使用相同的删除逻辑

**根因**: 与 Bug 2 相同，共用 `requestDeleteNode` 方法

**修复方案**: 与 Bug 2 相同

**讨论状态**: 🔄 Plan Generated → `docs/superpowers/plans/2026-05-31-fix-db-notes-count.md`

**讨论状态**: 🔄 In Progress

---

#### Bug 4: F2 修改节点名称没有实时更新

**描述**: 使用 F2 快捷键修改节点名称后，再次按 F2 打开的对话框中仍然显示旧的名称

**期望行为**: 每次打开修改对话框应该显示当前节点的最新名称

**根因**: `editNode` 更新数据库后，`notesData` 被更新，但 `selectedNode`（父组件的状态）没有被更新

**修复方案**: 在 `editNode` 成功更新后，调用 `setSelectedNode({ id, name })` 以同步 selectedNode

**讨论状态**: 🔄 Plan Generated → `docs/superpowers/plans/2026-05-31-fix-f2-name-refresh.md`

---

#### Bug 5: 修改后会取消选中状态

**描述**: 完成节点操作（创建、修改、删除）后，选中状态会被清除

**期望行为**: 操作完成后应该保持选中状态，只有用户主动点击空白或其他节点时才取消选中

**讨论状态**: 🔄 In Progress

---

## Impact

- **涉及文件**:
  - `web/src/pages/MindMap.jsx` - 主要逻辑
  - `web/src/db/db.js` - 数据库操作
  - `web/src/pages/note/ContextMenu/ContextMenu.jsx` - 右键菜单

- **数据库**: 需要检查 `db.notes.count()` 的正确用法

---

## Sub-changes

When a bug discussion is complete, a separate sub-change will be created for the fix.

| Bug | Sub-change Name | Plan Location | Status |
|-----|-----------------|---------------|--------|
| Bug 1 | `fix-ctrl-n-no-selection` | `docs/superpowers/plans/2026-05-31-fix-ctrl-n-no-selection.md` | Plan Ready |
| Bug 2 | `fix-db-notes-count` | `docs/superpowers/plans/2026-05-31-fix-db-notes-count.md` | Plan Ready |
| Bug 3 | (merged with Bug 2) | `docs/superpowers/plans/2026-05-31-fix-db-notes-count.md` | Plan Ready |
| Bug 4 | `fix-f2-name-refresh` | `docs/superpowers/plans/2026-05-31-fix-f2-name-refresh.md` | Plan Ready |
| Bug 5 | `fix-selection-state-retention` | - | Todo |