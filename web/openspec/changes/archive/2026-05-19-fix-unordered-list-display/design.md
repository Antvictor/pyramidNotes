## Context

当前无序列表（`-` 或 `+` 标记）在预览时显示原始语法符号，而不是预期的圆点样式。问题在于 CSS 没有正确设置 `list-style-type`。

## Goals / Non-Goals

**Goals:**
- 无序列表 `- item` 或 `+ item` 显示为 `• item`（黑色圆点）

**Non-Goals:**
- 不修改有序列表样式（那是另一个 issue）
- 不修改列表回车行为

## Decisions

### 1. 使用 CSS list-style-type 实现圆点

**决定**：使用 `list-style-type: disc` + CSS list-style 伪元素显示圆点

**理由**：
- 纯 CSS 实现，无需修改装饰器逻辑
- `list-style-type: disc` 是标准的无序列表样式
- 配合 `::before` 伪元素可以精确控制圆点颜色和位置

**替代方案**：
- 使用 `::before` 伪元素 + `content: "•"` 手动插入圆点字符
- 优点：完全控制样式
- 缺点：需要手动处理缩进

## Risks / Trade-offs

- **Risk**: 父元素的 `display: block` 可能导致 `list-style` 不生效
- **Mitigation**: 确保列表项父级使用 `display: list-item` 或 `<ul>` 语义标签