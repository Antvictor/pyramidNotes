## Context

当前 Markdown 预览存在 3 个问题需要修复：

### Issue 1: 代码块多行边框问题

CSS `.md-code-block-content` 当前为每行应用样式，导致多行代码块看起来像多个独立的代码行而非一个整体。

**解决思路**：整个 FencedCode 节点的内容（从第一个换行后到最后一个换行前）应用统一的 `display: block` 样式，使其成为一个整体。

### Issue 2: 列表序号与文字间隔过大

CSS `.md-list-item-content` 的 `padding-left: 0.25em` 和 `margin-left: 0.5em` 导致序号与文字间隔过大。

**解决思路**：减少 padding/margin，无序列表使用默认 disc 样式，有序列表使用 `::before` 的 `margin-right` 控制间隔。

### Issue 3: 引用块回车自动继续

原 autoList.ts 只处理列表项，不处理引用块。需要扩展以支持：
- `> line1` 后按回车自动生成 `> `
- 如果只有 `> ` 没有内容，按回车删除 `>` 并结束引用

**解决思路**：重构为策略模式：
- `autoContinue.ts` - 基础框架，管理策略注册和协调
- `autoList.ts` - 列表策略（无序/有序）
- `autoBlockquote.ts` - 引用块策略

## Goals / Non-Goals

**Goals:**
- 代码块多行显示为一个整体
- 列表序号与文字间隔适当（1-2 空格）
- 引用块回车自动继续 `>`
- 可扩展的 auto-continue 架构（支持未来添加代码块```等）

**Non-Goals:**
- 不修改其他 Markdown 语法行为
- 不破坏现有功能