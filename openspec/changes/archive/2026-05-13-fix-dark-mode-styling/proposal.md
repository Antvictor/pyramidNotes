## Why

当前暗黑模式实现存在架构问题：`dark.css` 使用 `!important` 硬编码覆盖样式，破坏了统一的 CSS 变量系统。

具体问题：
- `DialogContent` 使用 `bg-background` class，在暗黑模式下应该使用 `--background`（深色）
- 但 `dark.css` 中的硬编码覆盖将其强制改为亮色背景
- 导致白色文字 + 白色背景，内容不可见

**根本原因**：`dark.css` 中的覆盖样式绕过了 CSS 变量和 Tailwind 的 `dark:` 变体机制。

## What Changes

1. **移除 `dark.css` 中的硬编码覆盖**：删除使用 `!important` 的强制覆盖样式
2. **保留 CSS 变量定义**：`html.dark` 选择器下的变量定义是正确的，保持不变
3. **确保 Tailwind dark 模式正常工作**：通过 `html.dark` class 激活 Tailwind 的 `dark:` 变体

## Capabilities

### New Capabilities

- `dark-mode-unified-styling`: 暗黑模式样式统一通过 CSS 变量和 Tailwind `dark:` 变体实现，不再使用硬编码覆盖

### Modified Capabilities

- 无

## Impact

- `web/src/styles/dark.css` - 移除硬编码覆盖，保留 CSS 变量定义
- 所有使用 `bg-background`、`text-foreground` 等 class 的组件将正确响应暗黑模式