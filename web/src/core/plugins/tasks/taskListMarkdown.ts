import { TaskList } from "@tiptap/extension-list";

type SerializerThis = {
  editor: { storage: { markdown: { options: { bulletListMarker?: string } } } };
};

type SerializerState = {
  renderList: (node: unknown, delimiter: string, firstDelimiter: () => string) => void;
};

export const TaskListMarkdown = TaskList.extend({
  addStorage() {
    return {
      markdown: {
        serialize(
          this: SerializerThis,
          state: SerializerState,
          node: unknown,
        ) {
          return state.renderList(
            node,
            "  ",
            () => `${this.editor.storage.markdown.options.bulletListMarker || "-"} `,
          );
        },
        parse: {
          // 不启用 markdown-it-task-lists：整个列表一旦含任务项会被标记为 taskList，
          // 混排列表会丢项。任务标记统一由 TaskListConversion 在事务中按连续段转换。
          setup() {},
          updateDOM() {},
        },
      },
    };
  },
});
