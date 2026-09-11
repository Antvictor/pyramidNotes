# Tasks

## 1. 基础
- [x] 1.1 安装 katex、mermaid;devDeps markdown-it
- [x] 1.2 i18n 键(editor.mathRenderError/mermaidRenderError/editSource,zh-CN + en)

## 2. 数学语法层
- [x] 2.1 定界符正则(货币安全)与属性编解码
- [x] 2.2 markdown-it 规则(行内/块级,幂等注册)
- [x] 2.3 renderKatex 包装
- [x] 2.4 纯逻辑单测

## 3. 数学节点
- [x] 3.1 mathInline 节点 + NodeView + InputRule + 序列化
- [x] 3.2 mathBlock 节点 + NodeView(空内容初始编辑态)+ InputRule + 序列化
- [x] 3.3 Backspace/Delete 还原($...$ / $$…$$)

## 4. 代码块渲染
- [x] 4.1 resolveRenderedCodeLanguage + 测试
- [x] 4.2 RenderedCodeBlockView 基类(编辑态切换、空源码、销毁守卫)
- [x] 4.3 MermaidBlockView(懒加载单例、防抖、错误态、主题跟随)
- [x] 4.4 MathCodeBlockView(同步 KaTeX、错误态)
- [x] 4.5 EnhancedCodeBlock 分支(其余语言返回 null)

## 5. 接线与样式
- [x] 5.1 TipTapEditor 注册扩展 + katex CSS
- [x] 5.2 ReadOnlyMarkdownPreview 注册(StarterKit codeBlock: false)
- [x] 5.3 markdown.css 渲染容器/错误态/编辑态样式

## 6. 验证
- [ ] 6.1 vitest 全量 + vite build
- [ ] 6.2 手动验收清单(12 项,见 design.md 与规格)
