# 设计：反链面板显隐设置

- 设置键 `showBacklinks: boolean`，默认 `true`；electron `loadSettings` 以 `{...DEFAULT_SETTINGS, ...parsed}` 合并（settings.cjs），旧 settings.json 自动获得默认值，无需迁移
- 布尔读取必须 `!== undefined`（false 不可被 falsy 判断吞掉）
- 仅控制 BacklinkPanel 挂载；反链数据查询照常；BacklinkPanel 空列表返回 null 的自身逻辑不变
- 设置页行复制「编辑器边栏」行结构，硬编码中文文案（与该区块现状一致）
- 实时链路：`saveSettings` 合并任意新键并广播 `settings-changed`（ipc/settings.cjs 零改动），`Node.jsx` 既有 `onSettingsChanged` 监听中同步状态
