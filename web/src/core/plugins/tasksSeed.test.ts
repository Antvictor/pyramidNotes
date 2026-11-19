import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import StarterKit from "@tiptap/starter-kit";
import { Editor, Extension, type AnyExtension } from "@tiptap/core";
import { Markdown } from "tiptap-markdown";
import { Fragment } from "@tiptap/pm/model";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { TaskItem, TaskList } from "@tiptap/extension-list";

const seedDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../electron/plugins-seed/tasks",
);

interface PluginContext {
  id: string;
  apiVersion: number;
  manifest: unknown;
  tiptap: Record<string, unknown>;
  editor: { registerExtensions: (extensions: AnyExtension[]) => void };
  ui: { injectStyle: (css: string) => void };
}

let seedExtensions: AnyExtension[] = [];

beforeAll(async () => {
  const code = readFileSync(path.join(seedDir, "main.mjs"), "utf8");
  const dataUrl = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
  const module = await import(/* @vite-ignore */ dataUrl);
  const extensions: AnyExtension[] = [];
  const ctx: PluginContext = {
    id: "tasks",
    apiVersion: 1,
    manifest: JSON.parse(readFileSync(path.join(seedDir, "manifest.json"), "utf8")),
    tiptap: {
      Extension,
      Plugin,
      PluginKey,
      TextSelection,
      Fragment,
      extensions: { TaskList, TaskItem },
    },
    editor: {
      registerExtensions: (list) => extensions.push(...list),
    },
    ui: { injectStyle: () => {} },
  };
  await module.default(ctx);
  seedExtensions = extensions;
});

function makeEditor(content: unknown = "") {
  return new Editor({
    extensions: [
      StarterKit.configure({ code: false, codeBlock: false, hardBreak: false }),
      ...seedExtensions,
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

function loadMarkdown(editor: Editor, markdown: string) {
  editor.commands.setContent(markdown);
}

describe("tasks seed plugin", () => {
  it("registers task list, task item, tight, markdown and conversion extensions", () => {
    const names = seedExtensions.map((extension) => extension.name);
    expect(names).toEqual([
      "taskList",
      "taskItem",
      "taskListTight",
      "taskListConversion",
    ]);
  });

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

  it("round-trips task markdown", () => {
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
});
