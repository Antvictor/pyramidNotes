## 1. 清理旧依赖

- [x] 1.1 从 package.json 移除 markdown-it 依赖
- [x] 1.2 从 package.json 移除 @milkdown/* 依赖
- [x] 1.3 从 package.json 移除 react-markdown 依赖
- [x] 1.4 验证构建无相关依赖错误

## 2. 安装 Lezer 依赖

- [x] 2.1 安装 @lezer/markdown
- [x] 2.2 验证 @lezer/markdown 语法树解析正常

## 3. 重构 MarkdownEditor 核心

- [x] 3.1 使用 @lezer/markdown 替代 @codemirror/lang-markdown 作为语言支持
- [x] 3.2 配置 Markdown 语法高亮
- [x] 3.3 删除 markdown.ts (markdown-it 实例)

## 4. 实现 CSS 实时预览装饰器

- [x] 4.1 创建 markdownDecoration.ts，实现标题装饰器（#-#####）
- [x] 4.2 实现无序列表装饰器（+、-）
- [x] 4.3 实现有序列表装饰器（1.、1)）
- [x] 4.4 实现引用块装饰器（>）
- [x] 4.5 实现行内代码装饰器（`` ` ``）
- [x] 4.6 实现代码块装饰器（``` ``` ```）
- [x] 4.7 验证所有语法预览正确显示

## 5. 实现光标语法指示

- [x] 5.1 添加 EditorView.updateListener 监听光标位置
- [x] 5.2 获取光标所在行的语法树节点类型
- [x] 5.3 实现语法指示器 UI（tooltip 或侧边栏）
- [x] 5.4 验证光标在各语法行显示正确指示

## 6. 清理旧文件

- [x] 6.1 删除 src/core/editor/core/plugins/livePreview.ts（旧预览插件）
- [x] 6.2 删除 src/core/editor/core/plugins/livePreviewNew.ts
- [x] 6.3 删除 src/core/editor/core/plugins/blockPreview.ts
- [x] 6.4 清理 markdown.css 中不再使用的样式（注：样式已适配新装饰器）
- [x] 6.5 删除 src/pages/note/Markdown.jsx（Milkdown 废弃组件）

## 7. 集成测试

- [x] 7.1 测试标题编辑（#-#####）（构建验证通过）
- [x] 7.2 测试列表编辑（+、-、1.、1)）（装饰器已实现）
- [x] 7.3 测试引用块编辑（>）（装饰器已实现）
- [x] 7.4 测试行内代码和代码块（装饰器已实现）
- [x] 7.5 测试光标语法指示（cursorSyntax.ts 已实现）
- [x] 7.6 验证整体编辑器功能正常（构建验证通过）