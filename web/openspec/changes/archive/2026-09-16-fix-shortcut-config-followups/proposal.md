## Why

上一变更（`2026-09-16-settings-trash-search-ux`）归档后发现的四个问题：

1. **回归**：把快捷键默认值收敛到 electron 一处时，漏了 `extractNode` / `find` / `replace` ——
   这三个键只存在于被删除的前端副本里（前端 `note` 段 7 个键，electron 只有 4 个），
   收敛时未对齐，于是它们从设置界面消失、无法配置。
2. **清空后仍然生效**：`Node.jsx` 的 `keyBindings` 对这三个键写了 `|| "Ctrl+…"` 兜底，
   所以清空（含冲突清空）会被兜回默认值。三个匹配器
   （`matchEditorShortcut` / `matchKey` / `matchShortcut`）**本身对空串都是正确禁用的**。
3. **无法防止重复绑定**：录入一个已被占用的键会静默覆盖，没有任何冲突提示。
4. **编辑器内搜索跳转后 ESC 回 MindMap**：`handleSelectSearchResult` 跳转时没带 `state.fromNote`，
   与引用跳转 `openNode` 不一致；返回后 `selectedNode` 还是最初那个节点。

另：锁定项（`backToMap`）只显示 `[锁定]`，看不到它绑的是哪个键。

## What Changes

- **修复** `DEFAULT_SETTINGS.shortcuts.note` 补回 `extractNode` / `find` / `replace`（值与 `Node.jsx` 原兜底值一致）
- **修复** 去掉 `Node.jsx` 的逐键 `||` 兜底 —— **空 = 未绑定 = 不生效**
- **新增** 快捷键冲突检测：录入重复键时弹窗指明「已被哪个动作占用」，确认后**清空该动作的绑定**
  （锁定项**不可被清空**，此时仅提示、不分配）
- **新增** 「未绑定」占位显示
- **修复** 编辑器内搜索跳转带 `state.fromNote`，ESC 返回**来源笔记**
- **调整** 锁定项显示实际按键（`Escape [锁定]`）；`backToMap` 动作文案「返回思维导图」→「返回」

## Capabilities

### Modified Capabilities
- `settings`：快捷键默认值完整性、冲突处理、锁定项展示、动作文案
- `search`：编辑器内搜索跳转的来源语义（与引用跳转一致）

## Impact

- **代码**：`electron/common/settings.cjs`、`web/src/pages/settings/ShortcutsModal.jsx`、
  `web/src/pages/note/Node.jsx`、`web/src/i18n/resources/{zh-CN,en}.ts`
