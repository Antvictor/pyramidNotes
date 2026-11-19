// 示例插件：输入 -- 后自动替换为破折号 —
// 单文件 ES 模块：禁止 import；所有能力由 ctx 注入。
export default function activate(ctx) {
  const { defineExtension, defineInputRule } = ctx.pyramid;

  const SmartDash = defineExtension({
    name: "helloSmartDash",
    addInputRules() {
      return [
        defineInputRule({
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
