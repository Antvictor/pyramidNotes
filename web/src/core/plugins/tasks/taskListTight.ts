import { Extension } from "@tiptap/core";

// tiptap-markdown 的 MarkdownTightLists 只覆盖 bulletList/orderedList，
// taskList 缺少 tight 属性时序列化会按 loose list 输出，项与项之间多出空行。
export const TaskListTight = Extension.create({
  name: "taskListTight",
  addGlobalAttributes() {
    return [
      {
        types: ["taskList"],
        attributes: {
          tight: {
            default: true,
            parseHTML: () => true,
            renderHTML: () => ({}),
          },
        },
      },
    ];
  },
});
