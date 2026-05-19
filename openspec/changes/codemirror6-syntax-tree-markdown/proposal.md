## Why

当前项目的 Markdown 实现混合使用 markdown-it、Milkdown、react-markdown 等多个库，缺乏统一架构。现有方案使用行级解析，无法正确处理块级语法（如引用块、嵌套列表）。需要基于 CodeMirror 6 的语法树（Lezer）构建统一的 Markdown 编辑能力，实现实时预览与语法高亮。

## What Changes

- **移除** 现有 Markdown 技术栈：markdown-it、@milkdown/*、react-markdown
- **新增** 基于 Lezer 语法树的 Markdown 解析（使用 @lezer/markdown）
- **新增** 实时预览：通过 CSS 装饰器直接操作源数据样式，隐藏语法符号，显示渲染效果
- **新增** 光标语法指示：监听光标位置，动态显示当前行的 Markdown 语法
- **实现** 支持的语法：
  - 标题：`-#####`（层级）
  - 无序列表：`+`、`-`
  - 有序列表：`1.`、`1)`
  - 引用块：`>`
  - 行内代码：`` ` ``
  - 代码块：`` ``` ``

## Capabilities

### New Capabilities

- `syntax-tree-markdown-editor`: 基于 CodeMirror 6 + Lezer 语法树的 Markdown 编辑器核心，支持标题、列表、引用、代码块解析，CSS 装饰器实时预览，光标语法指示

### Modified Capabilities

- （无 - 新建能力）

## Impact

- **代码**：src/core/editor/ 下的 MarkdownEditor、livePreview、createEditor 等文件需重构
- **依赖**：package.json 中的 markdown-it、@milkdown/*、react-markdown 可移除
- **CSS**：markdown.css、markdown-preview 相关样式需适配新架构