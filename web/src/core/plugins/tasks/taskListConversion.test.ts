import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { tasksPlugin } from "./index";

function makeEditor(content: unknown = "") {
  return new Editor({
    extensions: [
      StarterKit.configure({ code: false, codeBlock: false, hardBreak: false }),
      ...tasksPlugin.createExtensions(),
      Markdown.configure({ html: false, tightLists: true, bulletListMarker: "-" }),
    ],
    content: content as never,
  });
}

function typeText(editor: Editor, text: string) {
  for (const char of text) {
    const { from, to } = editor.state.selection;
    const handled = editor.view.someProp("handleTextInput", (handler) =>
      handler(editor.view, from, to, char),
    );
    if (!handled) {
      editor.view.dispatch(editor.state.tr.insertText(char, from, to));
    }
  }
}

// StarterKit 的 TrailingNode 会在块级列表后补一个空段落，加载断言只看前面实际内容。
function loadMarkdown(editor: Editor, markdown: string) {
  editor.commands.setContent(markdown);
}

const listItem = (text: string) => ({
  type: "listItem",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

const bullet = (...items: unknown[]) => ({
  type: "doc",
  content: [{ type: "bulletList", content: items }],
});

describe("taskListConversion", () => {
  it("converts - [ ] typed inside a list item and keeps the cursor in the text", () => {
    const editor = makeEditor();
    typeText(editor, "- [ ] foo");
    const list = editor.state.doc.firstChild!;
    expect(list.type.name).toBe("taskList");
    expect(list.firstChild!.type.name).toBe("taskItem");
    expect(list.firstChild!.attrs.checked).toBe(false);
    expect(list.firstChild!.textContent).toBe("foo");
    expect(editor.state.selection.from).toBe(6);
    editor.destroy();
  });

  it("converts - [x] to a checked task item", () => {
    const editor = makeEditor();
    typeText(editor, "- [x] done");
    const item = editor.state.doc.firstChild!.firstChild!;
    expect(item.type.name).toBe("taskItem");
    expect(item.attrs.checked).toBe(true);
    expect(item.textContent).toBe("done");
    editor.destroy();
  });

  it("loads a mix of plain and task items as consecutive runs", () => {
    const editor = makeEditor();
    loadMarkdown(editor, "- a\n- [ ] b\n- c");
    const doc = editor.state.doc;
    expect(doc.child(0).type.name).toBe("bulletList");
    expect(doc.child(0).textContent).toBe("a");
    expect(doc.child(1).type.name).toBe("taskList");
    expect(doc.child(1).firstChild!.attrs.checked).toBe(false);
    expect(doc.child(1).textContent).toBe("b");
    expect(doc.child(2).type.name).toBe("bulletList");
    expect(doc.child(2).textContent).toBe("c");
    editor.destroy();
  });

  it("converts a fully marked list and round-trips its markdown", () => {
    const editor = makeEditor();
    loadMarkdown(editor, "- [ ] foo\n- [x] bar");
    const list = editor.state.doc.firstChild!;
    expect(list.type.name).toBe("taskList");
    expect(list.child(0).attrs.checked).toBe(false);
    expect(list.child(1).attrs.checked).toBe(true);
    const markdown = editor.storage.markdown.getMarkdown();
    expect(markdown).toBe("- [ ] foo\n- [x] bar");

    const reparsed = makeEditor();
    loadMarkdown(reparsed, markdown);
    expect(reparsed.state.doc.toJSON()).toEqual(editor.state.doc.toJSON());
    reparsed.destroy();
    editor.destroy();
  });

  it("preserves nested lists inside a converted task item", () => {
    const editor = makeEditor();
    loadMarkdown(editor, "- [x] parent\n  - child");
    const list = editor.state.doc.firstChild!;
    expect(list.type.name).toBe("taskList");
    const parent = list.firstChild!;
    expect(parent.attrs.checked).toBe(true);
    expect(parent.lastChild!.type.name).toBe("bulletList");
    expect(parent.lastChild!.textContent).toBe("child");
    editor.destroy();
  });

  it("leaves plain lists untouched when the conversion plugin is absent", () => {
    const editor = new Editor({
      extensions: [
        StarterKit.configure({ code: false, codeBlock: false, hardBreak: false }),
        Markdown.configure({ html: false }),
      ],
      content: bullet(listItem("[ ] a")) as never,
    });
    expect(editor.state.doc.firstChild!.type.name).toBe("bulletList");
    expect(editor.state.doc.textContent).toBe("[ ] a");
    editor.destroy();
  });
});
