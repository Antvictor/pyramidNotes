## Context

当前暗黑模式实现采用混合策略：
1. **正确的部分**：`html.dark` 选择器下的 CSS 变量定义
2. **有问题的部分**：`!important` 硬编码覆盖，强制将某些元素改回亮色背景

```css
/* dark.css 中的问题代码 */
html.dark [data-slot="button"],
html.dark .btn {
  background-color: var(--button-bg) !important;  /* 强制亮色 */
  color: var(--button-text) !important;
}

html.dark [data-variant="outline"],
html.dark .bg-background {
  background-color: var(--button-bg) !important;  /* 问题根源 */
}
```

这导致使用 `bg-background` 的组件（如 DialogContent）在暗黑模式下显示错误。

## Goals / Non-Goals

**Goals:**
- 移除 `!important` 硬编码覆盖
- 恢复 CSS 变量和 Tailwind `dark:` 变体的正常功能
- 暗黑模式下 `bg-background` 正确使用 `--background` 变量（深色）

**Non-Goals:**
- 不修改 CSS 变量定义（这些是正确的）
- 不改变组件的 class 结构
- 不引入新的样式系统

## Decisions

### Decision 1: 移除硬编码覆盖样式

**选择**：删除 `dark.css` 底部使用 `!important` 的 button 和 background 覆盖样式。

**原因**：
- `!important` 覆盖绕过了正常的 CSS 级联和 Tailwind 的 `dark:` 变体
- 按钮等组件应该通过 Tailwind 的 `dark:` 变体来控制暗黑模式样式
- 当前项目使用 `html.dark` class 激活暗黑模式，Tailwind 应该能正确识别

**需要删除的代码**：
```css
/* Button overrides - use light mode background colors in dark mode */
--button-bg: oklch(1 0 0);
--button-text: oklch(0.145 0 0);

/* Dark mode button styles - force light background */
html.dark [data-slot="button"],
html.dark .btn { ... }
html.dark [data-slot="button"]:hover,
html.dark .btn:hover { ... }
html.dark [data-variant="outline"],
html.dark .bg-background { ... }
```

**保留的代码**：
```css
html.dark {
  /* CSS 变量定义 - 这些是正确的 */
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... 其他变量 */
}
```

## Risks / Trade-offs

[Risk] 删除覆盖后按钮在暗黑模式下可能显示为深色 → [Mitigation] 如有需要，通过 Tailwind 的 `dark:` 变体在组件级别调整

[Risk] 如果覆盖是为了特定的 UI 需求而添加的 → [Mitigation] 先验证当前 UI 行为，再决定是否完全移除