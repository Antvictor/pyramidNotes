## Context

当前 Markdown 预览存在 3 个问题需要修复：

### Issue 1: 代码块多行边框问题

CSS `.md-code-block-content` 当前为每行应用样式，导致多行代码块看起来像多个独立的代码行而非一个整体。

**解决思路**：使用 CSS `display: flex; flex-direction: column` 或调整结构，确保多行内容在同一个边框内。

### Issue 2: 列表序号与文字间隔过大

CSS `.md-list-item-content` 的 `padding-left: 0.25em` 和 `margin-left: 0.5em` 导致序号与文字间隔过大。

**解决思路**：减少 padding/margin，或使用 `::before` 的 `margin-right` 控制间隔。

### Issue 3: 引用块回车自动继续

`autoList.ts` 只处理列表项，不处理引用块。需要扩展以支持：
- `> line1` 后按回车自动生成 `> `
- 如果只有 `> ` 没有内容，按回车删除 `>` 并结束引用

## Goals / Non-Goals

**Goals:**
- 代码块多行显示为一个整体
- 列表序号与文字间隔适当（1-2 空格）
- 引用块回车自动继续 `>`

**Non-Goals:**
- 不修改其他 Markdown 语法行为