# syntax-tree-markdown-editor Specification

## Purpose

基于 CodeMirror 6 + Lezer 语法树实现 Markdown 编辑能力，支持标题、列表、引用、代码块、行内代码的解析与实时预览。

## Requirements

### Requirement: 语法树解析

编辑器 SHALL 使用 @lezer/markdown 解析 Markdown 文本为语法树，支持以下语法节点：

| 语法 | 节点类型 |
|------|---------|
| `# Header` | Heading |
| `## Header` | Heading (level 2) |
| `- List item` | BulletList > ListItem |
| `+ List item` | BulletList > ListItem |
| `1. List item` | OrderedList > ListItem |
| `1) List item` | OrderedList > ListItem |
| `> Quote` | BlockQuote |
| `` `code` `` | InlineCode |
| ``` ```code``` ``` | CodeBlock |

#### Scenario: 标题解析
- **WHEN** 用户输入 `# Title`
- **THEN** 语法树包含 `Heading` 节点，属性 `level: 1`

#### Scenario: 嵌套列表解析
- **WHEN** 用户输入多级列表
- **THEN** 语法树正确嵌套：BulletList > ListItem > BulletList > ListItem

### Requirement: CSS 实时预览

编辑器 SHALL 通过 CodeMirror Decoration API 实现 CSS 级实时预览。

#### Scenario: 标题预览
- **WHEN** 用户编辑 `# Header`
- **THEN** 视觉上显示为 `<h1>Header</h1>` 样式，`# ` 被隐藏

#### Scenario: 引用块预览
- **WHEN** 用户编辑 `> Quote`
- **THEN** 视觉上显示为引用样式，`> ` 被隐藏

#### Scenario: 行内代码预览
- **WHEN** 用户编辑 `` `code` ``
- **THEN** 视觉上显示为等宽字体背景样式

### Requirement: 光标语法指示

编辑器 SHALL 监听光标位置，动态显示当前行语法。

#### Scenario: 光标在标题行
- **WHEN** 光标位于 `# Header` 行
- **THEN** 语法指示器显示 "标题"

#### Scenario: 光标在引用行
- **WHEN** 光标位于 `> Quote` 行
- **THEN** 语法指示器显示 "引用"

### Requirement: 删除旧依赖

编辑器 SHALL 不使用以下库：

| 库 | 替代方案 |
|----|---------|
| markdown-it | @lezer/markdown |
| @milkdown/* | CodeMirror 6 |
| react-markdown | 纯 CodeMirror |

#### Scenario: 依赖移除验证
- **WHEN** 构建项目
- **THEN** 不包含 markdown-it、@milkdown/*、react-markdown