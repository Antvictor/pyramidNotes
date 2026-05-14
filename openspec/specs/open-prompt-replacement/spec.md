# open-prompt-replacement Specification

## Purpose
TBD - created by archiving change replace-antd-with-radix-ui. Update Purpose after archive.
## Requirements
### Requirement: OpenPrompt 组件使用 radix-ui Dialog 实现
OpenPrompt 组件 SHALL 使用 radix-ui Dialog 组件替代 antd Modal，提供输入节点名称的对话框功能。

#### Scenario: 显示对话框并输入内容
- **WHEN** 父组件传入 `visible={true}` 和 `title="节点名称"`
- **THEN** 对话框显示，标题为"请输入节点名称"，输入框显示当前 title 值

#### Scenario: 确认输入
- **WHEN** 用户在输入框输入文本后点击确定按钮或按 Enter 键
- **THEN** 调用 `onOk(id, value)` 回调，关闭对话框

#### Scenario: 取消输入
- **WHEN** 用户点击取消按钮
- **THEN** 调用 `onCancel()` 回调，关闭对话框，输入框内容保持不变

#### Scenario: 自动聚焦
- **WHEN** 对话框打开
- **THEN** 输入框自动获取焦点

#### Scenario: ESC 关闭
- **WHEN** 用户按 ESC 键
- **THEN** 调用 `onCancel()` 回调，关闭对话框

