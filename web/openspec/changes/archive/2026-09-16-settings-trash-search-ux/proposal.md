## Why

三项独立问题：

1. **设置页数字输入清空跳值**：`handleTrashRetentionChange` 用 `Math.max(1, parseInt(value) || 30)` ——
   清空时 `parseInt("")` 为 `NaN` → `NaN || 30` → 直接变 30；且 input 的 value 受控于设置值，一清空立刻被写回。
   想改成 7 天必须先输 7 再删掉前面的 3。**同类问题**还在系统字号 / 笔记字号（清空跳 16）。
2. **回收站只能逐行「恢复」**：无法在应用内彻底删除，也没有多选。
3. **全文搜索没有快捷键入口**：搜索弹窗的 tab 是内部 state（默认「节点」），无法直接打开全文搜索，
   弹窗打开后也无法用快捷键切 tab。

另有一个结构性隐患：快捷键默认值**重复三份**（`electron/common/settings.cjs`、`App.jsx`、`ShortcutsModal.jsx`），
根因是 `loadSettings` 的**浅合并**——`parsed.shortcuts` 会整块替换默认值，导致新增键对已有设置文件丢失，
前端两份副本正是为此兜底。

## What Changes

- **新增** `NumberField` 受控数字输入组件：编辑期只改本地字符串，失焦 / 回车才解析并夹取；清空后回到**原值**
- **新增** 回收站多选 + 「彻底删除」（警告确认后物理删除**整簇**）
- **新增** 可配置的全文搜索快捷键 `global.searchFullText`（默认 `Ctrl+Shift+K`）；
  同一个键两种作用：弹窗未打开则按对应 tab 打开，已打开则切到该 tab
- **修改** 快捷键默认值收敛到 electron 一处（`loadSettings` 与 `saveSettings` 都深合并 `shortcuts`），删除两份前端副本
- **移除** `App.jsx` 中写死的 Ctrl+K 分支及其 `searchOpen` 死代码

## Capabilities

### Modified Capabilities
- `settings`：数字输入编辑体验；快捷键默认值单一来源
- `trash`：回收站多选彻底删除
- `search`：可配置全文搜索快捷键与弹窗 tab 切换

## Impact

- **代码**：
  - electron：`common/settings.cjs`、`ipc/trash.cjs`、`preload.cjs`
  - web：`components/ui/number-field.jsx`(新)、`pages/settings/Settings.jsx`、
    `pages/settings/ShortcutsModal.jsx`、`pages/trash/Trash.jsx`、`components/node-search.tsx`、
    `pages/MindMap.jsx`、`pages/note/Node.jsx`、`App.jsx`、`i18n/resources/{zh-CN,en}.ts`
