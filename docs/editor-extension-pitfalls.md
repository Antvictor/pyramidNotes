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

## 验证注意

- `tsc --noEmit` 因存量类型错误(路径别名未继承等)不可用;以 `vitest` + `eslint` + `vite build` 为准。
- vitest 需 Node 22(项目 `.nvmrc`):`PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH" pnpm exec vitest run`。
