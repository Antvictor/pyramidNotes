// 示例插件：在笔记里插入一个可点击的日期控件
// 用法：输入 "@today " 插入今天；点击已有日期可重新选择。
// 单文件 ES 模块：禁止 import；所有能力由 ctx 注入。
export default function activate(ctx) {
  const { defineNode, defineInputRule } = ctx.pyramid;

  const CalendarDate = defineNode({
    name: "calendarDate",
    group: "inline",
    inline: true,
    atom: true,
    selectable: true,

    addAttributes() {
      return { date: { default: "" } };
    },

    parseHTML() {
      return [
        {
          tag: "span[data-calendar-date]",
          getAttrs: (element) => ({ date: element.getAttribute("data-calendar-date") || "" }),
        },
      ];
    },

    renderHTML({ node, HTMLAttributes }) {
      return [
        "span",
        { ...HTMLAttributes, "data-calendar-date": node.attrs.date, class: "calendar-date" },
        node.attrs.date || "选择日期",
      ];
    },

    // 节点的外观与交互都在 NodeView 里实现（纯 DOM，无需任何依赖）
    addNodeView() {
      return ({ node, editor, getPos }) => {
        let current = node;
        let input = null;
        const dom = document.createElement("span");
        dom.className = "calendar-date";

        const showText = () => {
          dom.textContent = current.attrs.date || "选择日期";
          dom.dataset.calendarDate = current.attrs.date || "";
        };
        showText();

        const commit = (date) => {
          const pos = typeof getPos === "function" ? getPos() : null;
          if (pos === null || pos === undefined) return;
          const { state, view } = editor.view;
          view.dispatch(state.tr.setNodeMarkup(pos, undefined, { date }));
        };

        const closePicker = () => {
          if (!input) return;
          input.remove();
          input = null;
          showText();
        };

        dom.addEventListener("click", (event) => {
          event.preventDefault();
          if (input) {
            input.focus();
            return;
          }
          input = document.createElement("input");
          input.type = "date";
          input.className = "calendar-date-input";
          input.value = current.attrs.date || "";
          input.addEventListener("change", () => {
            commit(input.value);
            closePicker();
          });
          input.addEventListener("blur", () => {
            setTimeout(closePicker, 120);
          });
          dom.textContent = "";
          dom.appendChild(input);
          input.focus();
        });

        return {
          dom,
          update(updated) {
            current = updated;
            if (!input) showText();
          },
          stopEvent(event) {
            return Boolean(input) && event.target === input;
          },
        };
      };
    },

    addInputRules() {
      return [
        defineInputRule({
          find: /@today\s$/,
          handler: ({ state, range }) => {
            const date = new Date().toISOString().slice(0, 10);
            state.tr.replaceWith(
              range.from,
              range.to,
              state.schema.nodes.calendarDate.create({ date }),
            );
          },
        }),
      ];
    },
  });

  ctx.editor.registerExtensions([CalendarDate]);
}
