---
name: codemirror-lezer-architecture
description: CodeMirror 6 + Lezer 语法树实现 Markdown 实时预览的架构指南
---

# CodeMirror 6 + Lezer 架构指南

## 核心概念

### 两套解析系统的关系

| 包 | 作用 | 使用场景 |
|---|---|---|
| `@codemirror/lang-markdown` | 提供 `markdown()` 扩展，集成到 CodeMirror | 语法高亮、智能提示 |
| `@lezer/markdown` | 独立 Lezer 解析器，`parser.parse(text)` | 手动解析 Markdown 文本 |

**关键理解**：`@lezer/markdown` 是独立的 Lezer 语法定义，不依赖 CodeMirror，可以单独使用 `parser.parse(doc)` 获取语法树。

### 正确实现预览的方式

**用 `Decoration.mark` + CSS，不用 `Decoration.replace` + Widget**

```typescript
// 正确：用 mark 添加样式类
Decoration.mark({ class: "md-heading-content md-h1" })

// 错误：用 replace 替换（会导致光标异常）
Decoration.replace({ widget: new MyWidget() })
```

### Lezer Tree 遍历

```typescript
// 正确 API
tree.iterate({
    enter(node) {
        // node.name - 节点名称
        // node.from, node.to - 文档位置
    }
})

// 错误：直接传函数
tree.iterate(callback)
```

### RangeSetBuilder 排序要求

Decorations 必须按 `from` 位置排序后才能添加：

```typescript
const decorations: Array<{ from: number; to: number; class: string }> = []

// ... 收集 decorations ...

// 排序
decorations.sort((a, b) => a.from - b.from)

// 添加
for (const dec of decorations) {
    builder.add(dec.from, dec.to, Decoration.mark({ class: dec.class }))
}
```

## 常见错误

| 错误 | 后果 |
|---|---|
| 用 `Decoration.replace` + Widget 实现预览 | 光标位置错乱、编辑体验差 |
| 直接传函数给 `tree.iterate()` | `enter is not a function` |
| 不排序就添加 decorations | `Ranges must be added sorted` |
| 混淆 `syntaxTree()` 和 `parser.parse()` | 语法树不完整或不正确 |
| 假设所有节点都是顶层节点 | 列表、引用等嵌套块解析失败 |

## 项目实践 (pyramidNotes)

1. 用 `@lezer/markdown` 单独解析文档：`parser.parse(doc)`
2. 用 `Decoration.mark` 隐藏语法符号（`.md-syntax` 设为透明）
3. 用 `Decoration.mark` 添加语义类名（如 `.md-heading-content md-h1`）
4. CSS 负责实际渲染样式
5. 光标所在行不应用装饰（保持源码显示）