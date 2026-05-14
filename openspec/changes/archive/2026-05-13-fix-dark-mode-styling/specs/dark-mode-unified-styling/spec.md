## ADDED Requirements

### Requirement: 暗黑模式样式通过 CSS 变量统一管理
暗黑模式下的样式 SHALL 通过 CSS 变量（`--background`、`--foreground`、`--card` 等）统一管理，不再使用硬编码覆盖。

#### Scenario: DialogContent 在暗黑模式下正确显示背景
- **WHEN** 用户在暗黑模式下打开 Dialog
- **THEN** DialogContent 使用 `--background` 变量作为背景色（深色），`--foreground` 变量作为文字颜色（浅色）

#### Scenario: bg-background class 在暗黑模式下正确响应
- **WHEN** 组件使用 `bg-background` class 且用户启用了暗黑模式
- **THEN** 背景色使用 `--background` 变量，在暗黑模式下为深色

#### Scenario: 按钮在暗黑模式下使用正确颜色
- **WHEN** 用户在暗黑模式下查看按钮组件
- **THEN** 按钮背景色使用 `--primary` 或对应变量，不再被强制覆盖为亮色

### Requirement: 移除 !important 硬编码覆盖
`dark.css` SHALL 不再包含使用 `!important` 的样式覆盖。

#### Scenario: 无 !important 覆盖样式
- **WHEN** 检查 `dark.css` 文件内容
- **THEN** 文件中不包含 `!important` 关键字

#### Scenario: Tailwind dark: 变体正常工作
- **WHEN** 组件使用 Tailwind 的 `dark:` 变体（如 `dark:bg-background`）
- **THEN** 在暗黑模式下正确应用对应样式