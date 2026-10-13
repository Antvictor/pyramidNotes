import { Extension, type Editor } from "@tiptap/core";

// 表格 / 列表之外的场景（普通段落、标题、代码块）没有可用的 Tab 处理器时，Tab 会落到
// 浏览器默认行为，把焦点移出 contentEditable（光标消失）。这里兜底插入两个空格；
// Shift-Tab 仅阻止默认以保住焦点。priority 50 低于默认 100，让表格/列表的 Tab 先处理。
function outsideTableOrList(editor: Editor) {
  return (
    !editor.isActive("tableCell") &&
    !editor.isActive("tableHeader") &&
    !editor.isActive("listItem") &&
    !editor.isActive("taskItem")
  );
}

export const TabIndentation = Extension.create({
  name: "tabIndentation",
  priority: 50,
  addKeyboardShortcuts() {
    return {
      // 直接插字面文本：insertContent 会把纯空白内容当空串丢掉
      // （Tiptap CodeBlock 的 enableTabIndentation 正是因此失效）。
      Tab: ({ editor }: { editor: Editor }) => {
        if (!outsideTableOrList(editor)) return false;
        const { state, view } = editor;
        view.dispatch(state.tr.insertText("  "));
        return true;
      },
      "Shift-Tab": ({ editor }: { editor: Editor }) =>
        outsideTableOrList(editor) ? true : false,
    };
  },
});
