## Why

当前列表和引用块存在以下显示问题：
1. 引用黑边没有连起来，像多行而非一个块
2. 多行 `>` 引用只在第一行有效果，需要每行都有 `>` 才算一个引用区间
3. 有序列表显示为 `.` 而非 `1. 2. 3.`
4. 无序列表、有序列表、引用块宽度问题，文字与左侧间隔太大

## What Changes

- **修改** CSS 样式调整引用块边框连续性
- **修改** CSS 调整列表和引用块的 padding/margin
- **确保** 有序列表正确显示序号

## Capabilities

### Modified Capabilities

- `syntax-tree-markdown-editor`：修复列表和引用块样式

## Impact

- **代码**：`src/core/editor/css/markdown.css`