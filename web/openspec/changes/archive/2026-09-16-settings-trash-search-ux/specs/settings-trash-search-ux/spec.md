# settings-trash-search-ux Specification

## Purpose

改善设置页数字输入的编辑体验，为回收站补上多选彻底删除，为全文搜索提供可配置快捷键与弹窗内 tab 切换；
并把快捷键默认值收敛到单一来源。

## Requirements

### Requirement: 数字输入可自由编辑

数字输入框在编辑期 SHALL 只保留用户键入的字符串，SHALL NOT 在清空或中间态时强制写回数值。
解析与范围夹取 SHALL 仅在失焦或回车时发生。

清空后失焦时，输入框 SHALL 回到**编辑前的值**（而非默认值）。

### Requirement: 回收站多选彻底删除

回收站页面 SHALL 支持逐行勾选与全选；未勾选任何条目时「彻底删除」按钮 SHALL 处于禁用状态。

点击「彻底删除」SHALL 先弹出警告「彻底删除后无法恢复，请慎重选择」，用户确认后
SHALL 物理删除选中条目**及其所在整簇**（`"delete"=1` 的顶层节点与其全部 `"delete"=1` 后代），
并 SHALL 同步删除 `.delete/` 目录中对应的文件。

### Requirement: 可配置的全文搜索快捷键

系统 SHALL 提供两个可配置的全局快捷键：节点搜索（`global.search`）与全文搜索（`global.searchFullText`，默认 `Ctrl+Shift+K`）。

- 搜索弹窗**未打开**时按下任一快捷键 SHALL 打开弹窗并选中对应 tab
- 搜索弹窗**已打开**时按下任一快捷键 SHALL 切换到对应 tab

### Requirement: 快捷键默认值单一来源

快捷键默认值 SHALL 只在 `electron/common/settings.cjs` 定义一份。
`getSettings()` SHALL 始终返回完整的 `shortcuts` 对象（缺键由默认值补齐），
使渲染进程无需自备默认值副本。

### Requirement: 设置重置

快捷键设置的「重置」SHALL 恢复为默认值，且 SHALL NOT 依赖渲染进程本地的默认值副本。
