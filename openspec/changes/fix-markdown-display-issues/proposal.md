## Why

当前 Markdown 预览存在以下显示问题：
1. 代码块每行都有独立边框，不像一个整体代码块
2. 有序/无序列表序号与文字间隔过大
3. 引用块没有回车自动继续 `>` 标记

## What Changes

- **修复** 代码块 CSS，确保多行内容在一个整体边框内
- **修改** 列表 CSS，减少序号与文字的间隔
- **新增** 引用块回车自动继续 `>` 标记功能

## Capabilities

### New Capabilities

- `blockquote-auto-continue`：引用块回车自动继续 `>`，空引用行删除 `>`

### Modified Capabilities

- `syntax-tree-markdown-editor`：修改代码块和列表的 CSS 样式

## Impact

- **代码**：`web/src/core/editor/css/markdown.css`、`web/src/core/editor/core/plugins/autoList.ts`
- **影响**：代码块、列表、引用块预览效果