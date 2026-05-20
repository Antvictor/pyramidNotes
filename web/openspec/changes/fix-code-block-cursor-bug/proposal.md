## Why

当光标在有序列表行（如 `1. 1` 或 `2. 2`）时，代码块的 fence 标记失去了 `in-code-block` class，导致代码块样式消失。这是因为 fence 行的文本内容包含 ` ``` ` ，但判断逻辑可能受到了其他因素干扰。

## What Changes

- 修复有序列表行作为代码块边界检测的干扰问题
- 确保代码块边界检测与光标位置无关（纯文本检测）
- 保证代码块样式在所有光标位置下都正确显示

## Capabilities

### New Capabilities
- `code-block-cursor-fix`: 修复代码块在特定光标位置下样式丢失的问题

### Modified Capabilities
- (无)

## Impact

- `src/core/editor/core/plugins/codeBlockWrapper.ts`: 修改 fence 检测逻辑
- 测试场景：有序列表 + 代码块混合内容