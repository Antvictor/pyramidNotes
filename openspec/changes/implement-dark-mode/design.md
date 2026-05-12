## Context

系统目前使用单一主题样式，用户无法切换到暗黑模式。随着用户对深色主题需求的增加，需要实现暗黑模式切换功能。

## Goals / Non-Goals

**Goals:**
- 提供明/暗主题切换能力
- 主题切换对用户可见（通过 HTML class 切换）
- 支持本地存储持久化用户偏好
- 提供 Service 接口供后续功能调用

**Non-Goals:**
- 不在页面上添加切换按钮（后续由其他功能添加）
- 不支持跟随系统自动切换

## Decisions

1. **使用 CSS 变量 + class 切换方案**
   - 通过 `html` 标签上的 `class="dark"` 来切换暗黑模式
   - 所有颜色使用 CSS 变量定义，暗黑模式下变量值切换
   - 优点：切换简单、兼容性好、无需 JS 注入样式

2. **主题服务独立封装**
   - `ThemeService` 封装主题切换逻辑
   - 提供 `toggle()`、`setTheme(isDark: boolean)`、`getTheme()` 接口
   - 自动读写 localStorage 持久化

3. **项目结构**
   - `src/styles/variables.css` - CSS 变量定义
   - `src/styles/dark.css` - 暗黑模式变量覆盖
   - `src/services/themeService.ts` - 主题服务
   - `src/stores/themeStore.ts` - 主题状态管理

## Risks / Trade-offs

- [风险] 第三方组件可能不兼容 CSS 变量 → 需逐个排查并补充覆盖样式
- [风险] 初始加载时可能出现闪烁 → 可通过预加载 dark class 缓解
