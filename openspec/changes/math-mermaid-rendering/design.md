# 设计:编辑器数学公式与 Mermaid 图渲染

## 架构设计

### A. ```mermaid / ```math 代码块 —— EnhancedCodeBlock

**保持 codeBlock 节点类型不变**(输入、加载、粘贴、序列化全部走原生 fence 路径),仅新增自定义 NodeView 按 language 分支:

```ts
// extensions/enhancedCodeBlock.tsx
const EnhancedCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ({ node, editor, getPos }) => {
      if (node.attrs.language === "mermaid") return new MermaidBlockView(node, editor, getPos);
      if (node.attrs.language === "math") return new MathBlockCodeView(node, editor, getPos);
      return null; // 其他语言:ProseMirror 默认渲染 + lowlight decorations,现有行为零变化
    };
  },
});
```

**MermaidBlockView(纯 DOM NodeView 类)**:
- 结构:`div.mermaid-block` 内含 [原 `<pre><code>` 作为 contentDOM(渲染态隐藏)] + [渲染层 div(编辑态隐藏)]
- 渲染态:懒加载 mermaid(`await import("mermaid")`,单例缓存 + `initialize({ startOnLoad: false, securityLevel: "strict", theme: hasDarkClass ? "dark" : "default" })`),`mermaid.render(uniqueId, source)` → 渲染层 innerHTML = svg
- 防抖:源码变更 500ms 后重渲染;渲染前 `mermaid.parse()` 校验
- 错误态:语法错误显示错误框(i18n 文案)+ 保留源码,**不丢内容**
- 编辑态:双击渲染层 → 显示 contentDOM 聚焦原生编辑(原生撤销/IME 全保留);blur 或 Escape → 回渲染态
- 深色模式:`MutationObserver` 观察 `documentElement` class 变化 → 切换主题重渲染
- 销毁守卫:`destroy()` 清理 observer/防抖/废弃的异步渲染

**MathBlockCodeView**:同结构,KaTeX `renderToString(source, { displayMode: true, throwOnError: false })`,同步渲染无需防抖。

**round-trip**:codeBlock 原生 fence 序列化,```mermaid/```math 加载/保存零成本。

### B. 数学节点 $ 行内 / $$ 块级 —— mathNodes.tsx

**Node `mathInline`**(inline atom,对齐官方 Mathematics 扩展模式):
- `group: "inline", inline: true, atom: true, selectable: true`
- attr `latex`;parseHTML 匹配 `<math-inline data-latex>`,renderHTML 输出 `data-latex`(encodeURIComponent 编码)
- NodeView:`ReactNodeViewRenderer` → `span` innerHTML = `katex.renderToString(latex, { displayMode: false })`,`contentEditable={false}`
  - **编辑交互**:双击 → 行内小输入框(替换渲染层);Enter/blur 提交(`updateAttributes`),Escape 取消
  - **空 latex** → 占位态(显示「双击编辑」i18n 文案),不调 KaTeX
- markdown storage:`serialize` → `state.write("$" + latex + "$")`;`parse.setup` → 注册 markdown-it inline 规则
- InputRule(防货币误判):开定界符前必须是 行首/空白/括号引号/标点(**不能是字母数字或 CJK**),内容首尾不能是空白

**Node `mathBlock`**(block atom):
- attr `latex`;parseHTML 匹配 `<math-block data-latex>`
- NodeView:`NodeViewWrapper` + KaTeX displayMode 渲染;双击 → textarea 源码编辑;Escape/blur 提交(`updateAttributes`)
  - **空 latex** → 占位态;`$$` 输入建块后直接进入编辑态
- markdown storage:`serialize` → `state.write("$$\n" + latex + "\n$$")` + `closeBlock`;`parse.setup` → 注册 markdown-it **block 规则**:`$$` 开头扫描至闭合 `$$`(支持多行),渲染为 `<math-block data-latex>`
- InputRule:`/(?<=^|[^$])\$\$$/`(行尾输入 `$$` 即创建空公式块,NodeView 自动进入编辑态)
  - **`$$x$$` 连打行为**:输入第 2 个 `$` 时即建块进编辑态,后续字符进入源码;用户惯性补打的闭合 `$$` 会落入 latex 源码 → KaTeX 错误态提示修正;v1 不做自动配对(已知取舍)

**markdown-it 规则注册**(导出 `registerMathSyntax(md)`,`__mathSyntaxRegistered` 幂等守卫,模式同 `registerInternalNodeSyntax`):
- inline 规则 `$...$`:`md.inline.ruler.before("image", "math_inline", ...)`,渲染 `<math-inline data-latex="...">`
- block 规则 `$$...$$`:`md.block.ruler.before("fence", "math_block", ...)`,渲染 `<math-block data-latex="...">`
- `\$` 转义由 markdown-it 内建 escape 规则处理(先于我们的规则执行)
- **规则顺序依据(必须以测试锁定)**:markdown-it inline 链中 escape 与 code-span 先于 image → 行内代码 `` `$x$` `` 与 `\$` 均不会被误转换

### C. 接线改动

**`TipTapEditor.tsx`**:
- `codeBlockLowlight` 替换为 `enhancedCodeBlock`
- `extensions` 数组加入 `MathInline`、`MathBlock`
- `handleEditorKeyDown` 增加 Backspace/Delete 还原逻辑(模式同 `restoreInternalNodeLinkToken`):
  - mathInline 选中/相邻删除 → 还原 `$latex$` 文本
  - mathBlock 同理 → 还原 `$$\nlatex\n$$` 文本
- 新增 `import "katex/dist/katex.min.css"`

**`InternalNodeLink.tsx` — ReadOnlyMarkdownPreview(嵌入节点预览)**:
- 扩展列表加入 `MathInline`、`MathBlock`、`EnhancedCodeBlock`(StarterKit 补 `codeBlock: false`)
- markdown 规则随扩展的 `parse.setup` 自动注册,无需额外接线

**`markdown.css`**:
- `.math-inline-view`、`.math-block-view`、`.rendered-code-block` 容器样式(居中、内边距、背景)
- KaTeX 错误态、mermaid 错误态样式(红色提示)
- 深色模式适配(`.dark` 下 KaTeX 前景色继承,mermaid 走主题)

**i18n**:`editor.mathRenderError`、`editor.mermaidRenderError`、`editor.editSource`(zh-CN + en)

## 已验证的技术事实(探索结论)

| 事实 | 证据位置 |
|------|---------|
| tiptap-markdown 解析路径 = markdown-it 渲染 HTML → TipTap parseHTML | `tiptap-markdown/dist/tiptap-markdown.es.js:830` |
| 扩展可通过 `markdown.parse.setup(markdownit)` 注册语法规则 | `InternalNodeLink.tsx` |
| markdown 序列化通过 `markdown.serialize(state, node)` | `InternalNodeLink.tsx` |
| **CodeBlockLowlight 不用 NodeView**,高亮走 decoration 插件(LowlightPlugin) | `node_modules/@tiptap/extension-code-block-lowlight/dist/index.js:29` |
| addNodeView 返回 `null` = 走默认渲染(现有行为) | ProseMirror 标准行为 |
| 深色模式 = `documentElement` 上的 `.dark` class | `main.jsx` + `index.css` |
| i18n = `useTranslation`(编辑器组件已用),类外可用全局 `i18n.t` | `FindReplaceBar.tsx` + `src/i18n/index.ts` |
| `$` 是 markdown-it 的 terminator char,文本规则会在 `$` 处停下交出控制权 | markdown-it 内联规则链 |

## 边界情况(已知取舍)

| 场景 | 处理 |
|------|------|
| 货币 `$100 and $200` | 开定界符前不能是字母/数字/CJK → 不转换(与 Obsidian 同策略) |
| `中文$变量$中文` | 同上不转换(已知取舍,保证货币安全) |
| `\$` 字面量 | markdown-it 内建 escape 处理;编辑器内 Backspace 还原逻辑输出 `\$` 无需特殊处理(latex 含 $ 视为非法,原样保留) |
| Mermaid 语法错误 | 错误框 + 源码保留可编辑,不丢内容 |
| 深色模式 | mermaid 切主题重渲染;KaTeX 前景继承 |
| mermaid 包体积(~1MB) | 动态 import 独立 chunk,编辑器启动不加载 |
| mathBlock 内含 `$$` | 已知不支持(病态输入),文档记录 |
| find/replace | mathInline/mathBlock 的 latex 存 attr,不参与搜索(源码在 ```math 代码块中可搜索);可接受 |
| 嵌入节点预览 | 数学/图扩展同步注册到 ReadOnlyMarkdownPreview |
| 粘贴 `$x$`/`$$…$$`/```mermaid 文本 | `transformPastedText: true` 已在 TipTapEditor markdownExtension 开启 → 走 markdown 解析自动转换,零额外代码 |
| mermaid/math 语言代码块的 lowlight 装饰 | highlightAuto 仍会计算 decorations,被渲染层忽略——无害,已接受 |
| mermaid 高级图表外部资源 | Electron 离线环境下依赖 CDN 的高级图标/资源降级;核心图表(流程图/时序图/甘特图等)纯本地渲染 |
