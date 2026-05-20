## Why

当前代码块检测使用 `modulo` 计数来确定 fence 边界，但问题在于：当光标经过任何块（代码块、无序列表、有序列表、引用块）时，后续第奇数个 ` ``` ` 的 `in-code-block` class 都会消失。

## What Changes

- 修复代码块 fence 检测逻辑，区分"内容中的 ```" 和 "真正的 fence"
- 确保 fence 检测完全基于文档文本内容，不受光标位置或 DOM 渲染影响
- 添加调试日志以便追踪问题

## Capabilities

### New Capabilities
- `code-block-fence-detection`: 修复 fence 检测的边界问题

### Modified Capabilities
- (无)

## Impact

- `src/core/editor/core/plugins/codeBlockWrapper.ts`: 修复检测逻辑
- 测试场景：各种块类型（列表、引用、标题）后面跟代码块