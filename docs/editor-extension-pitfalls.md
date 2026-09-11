# 编辑器扩展踩坑指南

编辑器扩展(extensions/)中的脆弱机制与已知坑位。改动前先读;修复脆弱区后在此追加。

## extend CodeBlockLowlight 会重复注册 lowlight 插件(挂载即崩)

**现象**:编辑器挂载抛 `Cannot read properties of undefined (reading 'localsInner')`,与笔记内容无关。

**根因链**:

1. tiptap 的 `getExtensionField` 会把扩展方法内的 `this.parent` 绑定为**父扩展的同名字段**。
2. `CodeBlockLowlight` 的 `addProseMirrorPlugins` 实现是 `[...(this.parent?.() || []), LowlightPlugin(...)]`。
3. 一旦 `CodeBlockLowlight.configure(...).extend({...})`(或先 extend 后 configure,顺序无关),
   `this.parent` 解析到已 configure 实例的同名字段(其返回值内含一份 LowlightPlugin),
   再叠加自身一份 → **lowlight 插件注册两次**。
4. 本仓库存在两份 prosemirror-view(`node_modules/` 根副本由 `@tiptap/extension-code-block-lowlight`
   解析使用,`web/node_modules/` 副本由 `@tiptap/core`/编辑器视图使用)。重复注册产生两份
   根副本 DecorationSet;prosemirror-view 的 `DecorationGroup.from` 在成员数 ≥2 且不全是
   本模块 DecorationSet 实例时走扁平化路径,`m.members` 为 undefined → `concat(undefined)`
   → group 中出现 undefined 成员 → 挂载崩溃。

**修复**(enhancedCodeBlock.tsx):extend 时覆盖 `addProseMirrorPlugins`,只透传 parent 链结果,
保证全局恰有一份 LowlightPlugin:

```ts
CodeBlockLowlight.configure({ lowlight }).extend({
  addNodeView() { /* ... */ },
  addProseMirrorPlugins() {
    return this.parent?.() || []; // 只取父链(CodeBlock 基类插件 + 唯一 LowlightPlugin)
  },
});
```

**回归测试**:`enhancedCodeBlock.test.ts` 中 "registers exactly one lowlight plugin"。

**规则**:对任何 `addProseMirrorPlugins` 同时「调用 `this.parent?.()`」且「追加自有插件」的
官方扩展做 `.extend()` 时,必须检查插件是否会被重复注册;必要时同样透传 parent 结果。

## nodeInputRule 有 match[1] 时只替换捕获组(定界符残留)

**现象**:输入 `$E=mc^2$` 转换为行内公式节点后,两侧各残留一个 `$` 文本字符。

**根因**:tiptap `nodeInputRule`(@tiptap/core `src/inputRules/nodeInputRule.ts`)的 handler
在 `match[1]` 存在时走特殊分支:仅用 `replaceWith` 替换**捕获组的范围**,
还会先把 `match[0]` 的最后一个字符重新 `insertText` 回去。因此正则写成
`\$(内容)\$` 时,两个 `$` 定界符都不在被替换区间内,变成残留文本。

**修复**(mathNodes.tsx):不用 `nodeInputRule`,直接 `new InputRule({...})`,
handler 里 `state.tr.replaceWith(range.from, range.to, this.type.create(attrs))`
替换完整匹配区间。`undoable` 默认 true,撤销由 input-rules 的重放机制处理。

**规则**:InputRule 的 find 正则带捕获组且希望整段匹配(含定界符)被节点替换时,
禁止使用 `nodeInputRule`,必须自定义 handler 替换完整 `range`。

## 内置 Keymap 扩展的 Enter 抢先于 input rules(fence + 回车建块失效)

**现象**:` ` ` ```mermaid ` + Enter 不会创建代码块(只有 ` ```mermaid ` + 空格才会),
段落直接被 split;input rules 插件自带的「Enter 触发」永远轮不到。

**根因**:tiptap 内置 Keymap 扩展(@tiptap/core `Keymap`)绑定了
`Enter: handleEnter = first([newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock])`,
对任意段落都会成功返回 true;插件 props 按序执行,它排在 input-rules 插件之前
→ input rules 的 handleKeyDown(Enter)支持被短路。

**修复**(enhancedCodeBlock.tsx):在扩展自己的 `addKeyboardShortcuts` 里加 `Enter` 绑定。
每个扩展的快捷键生成**独立的 keymap 插件**,而 `ExtensionManager.get plugins` 对
extensions 数组 reverse 后稳定排序(同 priority 时注册序靠后者排前)→ 本扩展的
keymap 插件先于内置 Keymap 执行。绑定内仅当光标所在段落文本恰为 ` ```[lang] `
(正则 `/^(```|~~~)([a-z0-9_+-]+)?$/`)时接管,否则回落父级 Enter
(CodeBlock 的三连回车退出等)+ 内置 handleEnter。

**规则**:凡是「输入 + Enter 建块」类需求,不能依赖 input rules 的 Enter 支持,
必须在扩展的 addKeyboardShortcuts 中自行绑定 Enter 并自行回落父级行为。

## 验证注意

- `tsc --noEmit` 因存量类型错误(路径别名未继承等)不可用;以 `vitest` + `eslint` + `vite build` 为准。
- vitest 需 Node 22(项目 `.nvmrc`):`PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" pnpm exec vitest run`。
