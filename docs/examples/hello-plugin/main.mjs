// 示例插件：输入 -- 后自动替换为破折号 —
// 注意：插件是单文件 ES 模块，禁止使用 import；所有能力由 ctx 注入。
export default function activate(ctx) {
  const { Extension, InputRule } = ctx.tiptap;

  const SmartDash = Extension.create({
    name: "helloSmartDash",
    addInputRules() {
      return [
        new InputRule({
          find: /--$/,
          handler: ({ state, range }) => {
            state.tr.replaceWith(range.from, range.to, state.schema.text("—"));
          },
        }),
      ];
    },
  });

  ctx.editor.registerExtensions([SmartDash]);
}
