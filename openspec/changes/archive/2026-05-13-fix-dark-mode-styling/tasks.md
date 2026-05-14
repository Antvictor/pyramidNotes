## 1. 分析当前 dark.css 问题

- [x] 1.1 检查 `dark.css` 中使用 `!important` 的覆盖样式 - 发现 3 处硬编码覆盖
- [x] 1.2 确认这些覆盖样式影响到的组件（DialogContent、Button 等）

## 2. 修复暗黑模式样式

- [x] 2.1 移除 `--button-bg` 和 `--button-text` 变量定义
- [x] 2.2 移除 `html.dark [data-slot="button"]` 覆盖样式
- [x] 2.3 移除 `html.dark [data-variant="outline"]` 覆盖样式
- [x] 2.4 移除 `html.dark .bg-background` 覆盖样式
- [x] 2.5 保留 `html.dark` 选择器下的 CSS 变量定义

## 3. 验证修复效果

- [ ] 3.1 在暗黑模式下测试 Dialog 显示
- [ ] 3.2 在暗黑模式下测试按钮样式
- [ ] 3.3 确认 Tailwind `dark:` 变体正常工作