## Context

当前项目使用 CodeMirror 6 作为编辑器框架，Markdown 解析依赖 markdown-it（渲染）+ CodeMirror @codemirror/lang-markdown（语法高亮）。存在以下问题：

1. **解析架构割裂**：markdown-it 负责渲染，lang-markdown 负责高亮，两者解析逻辑独立
2. **块级语法处理不足**：现有方案基于行级解析，无法正确处理嵌套列表、引用块等块级语法
3. **实时预览实现复杂**：通过 widget 替换行内容实现预览，代码脆弱

**约束**：
- 必须使用 CodeMirror 6
- 必须使用语法树（Lezer @lezer/markdown）
- 不能使用 markdown-it、Milkdown、react-markdown
- 需要支持：标题、列表、引用、代码块、行内代码

## Goals / Non-Goals

**Goals:**
- 基于 @lezer/markdown 构建统一的语法树解析
- 通过 CodeMirror Decoration API 实现 CSS 级别的实时预览（隐藏语法符号，显示渲染样式）
- 实现光标语法指示（cursor 行高亮 + 语法提示）
- 完整支持：#-#####、+ -、1. 1)、>、`` ` ``、``` ``` ```块

**Non-Goals:**
- 不实现表格、任务列表、链接、图片等语法
- 不实现导出为 HTML/PDF
- 不迁移现有 markdown-it 渲染逻辑

## Decisions

### 1. 使用 @lezer/markdown 作为解析器

**决定**：使用 @lezer/markdown（Lezer 语法树）替代 markdown-it

**理由**：
- 与 CodeMirror 6 原生集成
- 提供统一的语法树，可遍历所有节点
- 支持嵌套块级语法（引用块、列表嵌套）

**替代方案考虑**：
- markdown-it：已有渲染逻辑但解析独立，不支持语法树遍历
- custom markdown parser：工作量大，不可行

### 2. 预览模式：CSS 装饰器覆盖

**决定**：不替换行内容为 widget，而是通过 CSS 装饰器覆盖语法符号样式

**实现方式**：
- 使用 `Decoration.replace` 将语法符号（如 `#`、`##`、`-`、`>`）替换为语义化 span
- CSS 隐藏这些 span 的实际文字，通过 `::before` 等伪元素显示渲染样式
- 例如：`# Header` → `<h1>Header</h1>`，视觉上隐藏 `# `，显示 h1 样式

**替代方案考虑**：
- Widget 替换行内容：CodeMirror 5 常用，但性能开销大
- 分离编辑/预览面板：用户体验差，不符合"所见即所得"

### 3. 光标语法指示

**决定**：监听 CodeMirror 光标位置，通过 tooltip 或侧边栏显示当前行语法

**实现**：
- 使用 `EditorView.updateListener` 监听事务
- 获取光标所在行，使用语法树获取该行顶层节点类型
- 动态更新语法指示器 UI

### 4. 依赖清理

**决定**：移除以下依赖

| 依赖 | 移除原因 |
|------|---------|
| markdown-it | 使用 @lezer/markdown 替代 |
| react-markdown | 不再需要 |
| @milkdown/* | 已废弃，使用 CodeMirror |
| @codemirror/lang-markdown | @lezer/markdown 包含语法定义 |

**保留**：
- @codemirror/view、@codemirror/state、@codemirror/commands 等核心包

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| @lezer/markdown 不支持部分语法 | 扩展 Lezer 语法，或降级到行级解析 fallback |
| CSS 装饰器性能问题 | 限制装饰器数量，大文档使用虚拟化 |
| 光标语法指示延迟 | 使用 requestAnimationFrame 节流 |

## Open Questions

1. **列表继续（list continuation）**：输入 Enter 后自动继续列表序号，如何与语法树解析协调？
2. **代码块嵌套语法**：代码块内可能出现 ```，如何防止错误解析？
3. **性能基准**：大文档（>10000 行）的装饰器性能需要测试验证