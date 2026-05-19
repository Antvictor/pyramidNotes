# Markdown 语法解析规范

## 概述

本项目使用 **CodeMirror 6** + **Lezer (@lezer/markdown)** 实现 Markdown 编辑器的实时预览功能。

核心文件：
- `web/src/core/editor/core/plugins/markdownDecoration.ts` - 语法树装饰器
- `web/src/core/editor/core/plugins/autoList.ts` - 列表自动继续
- `web/src/core/editor/core/plugins/cursorSyntax.ts` - 光标语法指示
- `web/src/core/editor/css/markdown.css` - 预览样式

---

## 支持的语法

### 1. 标题 (Heading)

| 语法 | 示例 | 渲染结果 |
|------|------|---------|
| ATX Heading | `# Header` | `<h1>Header</h1>` |
| ATX Heading | `## Header` | `<h2>Header</h2>` |
| ATX Heading | `### Header` | `<h3>Header</h3>` |
| ATX Heading | `#### Header` | `<h4>Header</h4>` |
| ATX Heading | `##### Header` | `<h5>Header</h5>` |
| ATX Heading | `###### Header` | `<h6>Header</h6>` |

**实现细节：**
- Lezer 节点：`ATXHeading1` - `ATXHeading6`
- 标记字符（`# `）应用 `.md-syntax` 隐藏
- 内容应用 `.md-heading-content.md-h[N]` 样式

**CSS 样式：**
```css
.md-heading-content { display: inline; }
.md-heading-content.md-h1 { font-size: var(--font-size-h1); font-weight: bold; }
```

---

### 2. 无序列表 (Bullet List)

| 语法 | 示例 | 渲染结果 |
|------|------|---------|
| 短横线 | `- item` | • item |
| 加号 | `+ item` | • item |
| 星号 | `* item` | • item |

**实现细节：**
- Lezer 节点：`ListItem`（父节点 `BulletList`）
- 标记字符（`- `、`+ `、`* `）应用 `.md-syntax` 隐藏
- 内容应用 `.md-list-item-content` + `list-style-type: disc`

**CSS 样式：**
```css
.md-list-item-content {
    display: list-item;
    list-style-type: disc;
    list-style-position: outside;
    padding-left: 0.25em;
    margin-left: 0.5em;
}
```

---

### 3. 有序列表 (Ordered List)

| 语法 | 示例 | 渲染结果 |
|------|------|---------|
| 点号格式 | `1. item` | 1. item |
| 括号格式 | `1) item` | 1. item |

**实现细节：**
- Lezer 节点：`ListItem`（父节点 `OrderedList`）
- 通过正则检测有序列表：`/^\s*\d+[.)]/`
- 标记应用 `.md-list-ordered` 类
- 使用 CSS `::before` + `counter()` 显示序号

**CSS 样式：**
```css
.md-list-item-content.md-list-ordered {
    list-style-type: none;
}
.md-list-item-content.md-list-ordered::before {
    content: counter(list-item) ". ";
}
```

---

### 4. 引用块 (Blockquote)

| 语法 | 示例 | 渲染结果 |
|------|------|---------|
| 引用 | `> quote` | 左边框 + 斜体背景 |

**实现细节：**
- Lezer 节点：`Blockquote`
- 标记字符（`> `）应用 `.md-syntax` 隐藏
- 内容应用 `.md-blockquote-content` 样式
- 使用 `{ skip: true }` 跳过子节点（Paragraph），确保整体处理

**CSS 样式：**
```css
.md-blockquote-content {
    display: block;
    background: var(--color-blockquote-bg);
    border-left: 4px solid var(--color-blockquote-border);
    padding-left: 0.5em;
    font-style: italic;
}
```

**重要**：在标准 Markdown 中，引用块的每一行都必须有 `>` 前缀。没有 `>` 的行不是引用的一部分。

---

### 5. 行内代码 (Inline Code)

| 语法 | 示例 | 渲染结果 |
|------|------|---------|
| 行内代码 | `` `code` `` | 等宽字体 + 背景色 |

**实现细节：**
- Lezer 节点：`InlineCode`
- 反引号应用 `.md-syntax` 隐藏
- 代码内容应用 `.md-inline-code-content` 样式

**CSS 样式：**
```css
.md-inline-code-content {
    display: inline;
    background: var(--color-code-bg);
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-family: monospace;
}
```

---

### 6. 代码块 (Fenced Code)

| 语法 | 示例 | 渲染结果 |
|------|------|---------|
| 代码块 | ``` ```js\ncode\n``` ``` | 带边框的整体框 |

**实现细节：**
- Lezer 节点：`FencedCode`
- 围栏标记（``` 行）应用 `.md-syntax` 隐藏
- 内容区域应用 `.md-code-block-content` 样式
- 使用 `{ skip: true }` 跳过子节点，确保整体处理

**CSS 样式：**
```css
.md-code-block-content {
    display: block;
    background: var(--color-code-bg);
    border: 1px solid var(--color-code-border);
    padding: var(--spacing-code-block);
    font-family: monospace;
    white-space: pre;
}
```

---

## 回车自动继续列表

### autoList.ts 功能

```typescript
// 支持的列表标记格式
/^(\s*[+\-*]|\s*\d+\.|\s*\d+\))\s/
```

**行为：**
1. 按回车时，如果当前行是列表项，自动插入下一个列表标记
2. 连续按两次回车，取消列表继续，生成普通段落
3. 有序列表自动递增序号（`1.` → `2.`）

**支持的格式：**
- `- item` → `- `（继续）
- `+ item` → `+ `（继续）
- `1. item` → `2. item`（继续，自动递增）
- `1) item` → `2) item`（继续，自动递增）

---

## 光标语法指示

`cursorSyntax.ts` 提供当前光标位置的语法类型提示。

**显示类型：**
- `一级标题`、`二级标题`...
- `引用块`
- `列表项`
- `代码块`
- `行内代码`
- `段落`

---

## Lezer 节点类型参考

| 节点名称 | 说明 |
|----------|------|
| `ATXHeading1` - `ATXHeading6` | ATX 风格标题 |
| `SetextHeading1`, `SetextHeading2` | Setext 风格标题 |
| `Blockquote` | 引用块 |
| `BulletList` | 无序列表 |
| `OrderedList` | 有序列表 |
| `ListItem` | 列表项 |
| `FencedCode` | 围栏代码块 |
| `InlineCode` | 行内代码 |
| `Paragraph` | 段落 |
| `HeaderMark` | 标题标记 `#` |
| `QuoteMark` | 引用标记 `>` |
| `ListMark` | 列表标记 `-`、`1.` |
| `CodeMark` | 代码标记 `` ` `` |

---

## 架构决策

### 1. 为什么不使用 `Decoration.replace` + Widget？

Widget 替换会完全替换行的 DOM，导致光标位置异常和编辑体验差。使用 `Decoration.mark` + CSS 样式可以实现预览效果而不破坏编辑能力。

### 2. 为什么使用 `{ skip: true }`？

对于 `Blockquote` 和 `FencedCode` 等容器节点，如果不跳过子节点，会导致子节点（如 Paragraph）也被装饰处理，造成重复装饰或样式冲突。

### 3. 排序 Decorations 的重要性

`RangeSetBuilder` 要求 decorations 必须按 `from` 位置排序后添加，否则会抛出 `Ranges must be added sorted` 错误。

---

## 新增语法规范

如果要添加新的 Markdown 语法支持：

1. **确定 Lezer 节点类型**：参考 `@lezer/markdown` 的节点定义
2. **在装饰器中添加处理逻辑**：
   ```typescript
   if (name === "NEW_NODE") {
       // 处理标记隐藏
       decorations.push({ from, to: from + markLength, class: "md-syntax" });
       // 处理内容样式
       decorations.push({ from, to, class: "md-new-content" });
       return;
   }
   ```
3. **添加 CSS 样式**：在 `markdown.css` 中添加对应的 `.md-*` 样式
4. **更新本文档**：在上述表格中添加新语法说明