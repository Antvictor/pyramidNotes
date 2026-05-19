## Why

1. 有序列表仍显示 `.` 而非 `1. 2. 3.`
2. 代码块预览变成多个单行框而非一个整体框

## What Changes

- **检查** 有序列表 CSS `list-style-type: decimal` 是否正确应用
- **修复** 代码块装饰器，确保整体作为 FencedCode 节点处理

## Capabilities

### Modified Capabilities

- `syntax-tree-markdown-editor`：修复有序列表序号和代码块显示

## Impact

- **代码**：`src/core/editor/css/markdown.css`, `src/core/editor/core/plugins/markdownDecoration.ts`