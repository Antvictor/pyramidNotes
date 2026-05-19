## Why

无序列表（`-` 或 `+` 标记）在预览时仍然显示原始的语法符号，而不是标准的黑色圆点（•）。这不符合 Markdown 预览的预期行为。

## What Changes

- **修改** `.md-list-item-content` CSS 样式，添加 `list-style-type: disc` 使无序列表显示黑色圆点
- **新增** 无序列表标记的视觉转换：隐藏原始 `-`/`+`，通过 CSS list-style 显示 `•`

## Capabilities

### New Capabilities

- （无 - CSS 样式调整）

### Modified Capabilities

- `syntax-tree-markdown-editor`：修改列表项的预览样式，添加 `list-style-type: disc` 支持

## Impact

- **代码**：src/core/editor/css/markdown.css
- **影响**：无序列表预览显示效果