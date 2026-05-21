## Why

当前 pyramidNotes 编辑器基于 CodeMirror 6 + Lezer 构建，虽然能够对 Markdown 进行基础语法高亮和装饰，但实时预览（WYSIWYG）能力严重不足。用户期望像 Typora/HyperMD 那样在编辑时直接看到渲染效果，而不是仅看到源码加样式。

主要问题：
1. 当前装饰器系统只能给源码添加 CSS 样式，无法实现真正的块级元素渲染（如 `<blockquote>`, `<pre>`）
2. 代码块围栏检测经常因 DOM 渲染时机问题失效
3. 无法实现行内实时预览（如标题、引用在编辑时即显示为渲染后的样子）

## What Changes

1. **迁移编辑器底层**：从 CodeMirror 6 迁移到 Milkdown (ProseMirror + remark)
2. **实现 WYSIWYG 实时预览**：编辑时直接显示渲染后的 Markdown 内容
3. **代码块高亮**：使用 @milkdown/plugin-prism 实现语法高亮
4. **保持 Vue 集成**：使用 @milkdown/vue 官方集成包
5. **保留现有功能**：自动列表、引用块、自动续行等交互逻辑需要迁移

## Capabilities

### New Capabilities
- `milkdown-editor`: Milkdown 编辑器核心，提供 WYSIWYG Markdown 编辑能力
- `code-block-highlight`: 代码块语法高亮，基于 Prism 实现
- `auto-continue`: 列表、引用块的自动续行逻辑

### Modified Capabilities
- （无 - 这是全新迁移，现有 specs 目录为空）

## Impact

- **编辑器核心**：完全重写 `src/core/editor/` 目录
- **依赖变化**：移除 CodeMirror 6 相关包，添加 `@milkdown/core`, `@milkdown/react`, `@milkdown/plugin-prism`, `@milkdown/preset-commonmark`
- **React 集成**：使用 `@milkdown/react` 官方集成包
- **API 变化**：编辑器创建 API 从 `createEditor()` 变为 Milkdown 的 Editor API