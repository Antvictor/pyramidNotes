import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { tasksPlugin } from "./index";

function makeEditor(content = "") {
  const editor = new Editor({
    extensions: [
      StarterKit.configure({ code: false, codeBlock: false, hardBreak: false }),
      ...tasksPlugin.createExtensions(),
      Markdown.configure({ html: false, tightLists: true, bulletListMarker: "-" }),
    ],
    content: "",
  });
  if (content) editor.commands.setContent(content);
  return editor;
}

describe("tasks plugin", () => {
  it("registers task list and task item extensions", () => {
    const names = tasksPlugin.createExtensions().map((extension) => extension.name);
    expect(names).toContain("taskList");
    expect(names).toContain("taskItem");
    expect(tasksPlugin.id).toBe("tasks");
    expect(tasksPlugin.defaultEnabled).toBe(true);
  });

  it("parses - [ ] / - [x] into task items", () => {
    const editor = makeEditor("- [ ] foo\n- [x] bar");
    const list = editor.state.doc.firstChild!;
    expect(list.type.name).toBe("taskList");
    expect(list.childCount).toBe(2);
    expect(list.child(0).attrs.checked).toBe(false);
    expect(list.child(1).attrs.checked).toBe(true);
    expect(list.child(0).textContent).toBe("foo");
    editor.destroy();
  });

  it("serializes task items back to markdown", () => {
    const editor = makeEditor("- [ ] foo\n- [x] bar");
    expect(editor.storage.markdown.getMarkdown()).toBe("- [ ] foo\n- [x] bar");
    editor.destroy();
  });
});
