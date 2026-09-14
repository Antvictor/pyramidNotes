import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { describe, expect, it } from "vitest";

import { createTableExtensions } from "./tableExtensions";

const TABLE_MD = "| a | b |\n| --- | --- |\n| 1 | 2 |";

function makeEditor(content: string) {
  return new Editor({
    extensions: [
      StarterKit.configure({ code: false, codeBlock: false, hardBreak: false }),
      ...createTableExtensions(),
      Markdown.configure({ html: false }),
    ],
    content,
  });
}

// 自动转换用例直接给 HTML 段落（不能走 Markdown 解析，否则 <p> 会被转义成文本）。
function makePlainEditor(html: string) {
  return new Editor({
    extensions: [
      StarterKit.configure({ code: false, codeBlock: false, hardBreak: false }),
      ...createTableExtensions(),
    ],
    content: html,
  });
}

// 派发一个 keydown 走完整的 keymap 链（返回是否被处理）。
function pressKey(editor: Editor, key: string, shiftKey = false) {
  const event = new KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true });
  return Boolean(editor.view.someProp("handleKeyDown", (handler) => handler(editor.view, event)));
}

// 把光标放进文档里第一个文本节点（本用例中即第一个单元格内的 "a"）。
function placeInFirstText(editor: Editor) {
  let pos = -1;
  editor.state.doc.descendants((node, p) => {
    if (pos >= 0) return false;
    if (node.isText) pos = p;
    return undefined;
  });
  editor.commands.setTextSelection(pos);
}

describe("table parsing", () => {
  it("parses a GFM pipe table into table/tableRow/tableHeader/tableCell nodes", () => {
    const editor = makeEditor(TABLE_MD);
    const table = editor.state.doc.firstChild!;
    expect(table.type.name).toBe("table");

    const headerRow = table.firstChild!;
    expect(headerRow.type.name).toBe("tableRow");
    expect(headerRow.firstChild!.type.name).toBe("tableHeader");

    const bodyRow = table.child(1);
    expect(bodyRow.firstChild!.type.name).toBe("tableCell");
    editor.destroy();
  });
});

describe("table serialization", () => {
  it("round-trips a simple table back to a GFM pipe table (no HTML fallback)", () => {
    const editor = makeEditor(TABLE_MD);
    const md = editor.storage.markdown.getMarkdown();
    expect(md).toContain("| a | b |");
    expect(md).toContain("| --- | --- |");
    expect(md).toContain("| 1 | 2 |");
    expect(md).not.toContain("<table");
    editor.destroy();
  });
});

describe("cell content constraint", () => {
  it("constrains table cells to a single paragraph", () => {
    const editor = makeEditor(TABLE_MD);
    expect(editor.schema.nodes.tableCell.spec.content).toBe("paragraph");
    expect(editor.schema.nodes.tableHeader.spec.content).toBe("paragraph");
    editor.destroy();
  });
});

describe("cell keyboard guard", () => {
  it("swallows Enter inside a cell (no second block)", () => {
    const editor = makeEditor(TABLE_MD);
    placeInFirstText(editor);
    expect(pressKey(editor, "Enter")).toBe(true);
    const firstCell = editor.state.doc.firstChild!.firstChild!.firstChild!;
    expect(firstCell.childCount).toBe(1);
    editor.destroy();
  });

  it("inserts a hardBreak on Shift-Enter inside a cell", () => {
    const editor = makeEditor(TABLE_MD);
    placeInFirstText(editor);
    expect(pressKey(editor, "Enter", true)).toBe(true);

    let hasHardBreak = false;
    editor.state.doc.descendants((node) => {
      if (node.type.name === "hardBreak") hasHardBreak = true;
      return undefined;
    });
    expect(hasHardBreak).toBe(true);
    editor.destroy();
  });
});

describe("cell line breaks via <br>", () => {
  function cellHasHardBreak(editor: Editor) {
    let found = false;
    editor.state.doc.descendants((node) => {
      if (node.type.name === "hardBreak") found = true;
      return undefined;
    });
    return found;
  }

  it("parses <br> in a cell into a hardBreak", () => {
    const editor = makeEditor("| a<br>b |\n| --- |\n");
    expect(cellHasHardBreak(editor)).toBe(true);
    editor.destroy();
  });

  it("serializes a cell hardBreak as <br> (not the [hardBreak] placeholder)", () => {
    const editor = makeEditor("| a<br>b |\n| --- |\n");
    const md = editor.storage.markdown.getMarkdown();
    expect(md).toContain("<br>");
    expect(md).not.toContain("[hardBreak]");
    expect(md).not.toContain("[table]");
    editor.destroy();
  });

  it("round-trips a cell line break through markdown", () => {
    const editor = makeEditor("| a<br>b |\n| --- |\n");
    const md = editor.storage.markdown.getMarkdown();
    const reopened = makeEditor(md);
    expect(cellHasHardBreak(reopened)).toBe(true);
    editor.destroy();
    reopened.destroy();
  });
});

describe("auto-convert typed pipe syntax", () => {
  // appendTransaction 只在有 doc change 的事务里跑；在别处插一个字符来触发。
  function trigger(editor: Editor) {
    editor.view.dispatch(editor.state.tr.insertText("x", 1));
  }

  function findTable(editor: Editor) {
    let table = null;
    editor.state.doc.forEach((node) => {
      if (node.type.name === "table") table = node;
    });
    return table;
  }

  it("converts a header row + matching delimiter row into a table", () => {
    const editor = makePlainEditor("<p>head</p><p>|123|123|</p><p>|---|---|</p>");
    trigger(editor);
    const table = findTable(editor);
    expect(table).not.toBeNull();
    expect(table!.firstChild!.type.name).toBe("tableRow");
    expect(table!.firstChild!.childCount).toBe(2);
    expect(table!.firstChild!.firstChild!.type.name).toBe("tableHeader");
    expect(table!.firstChild!.firstChild!.textContent).toBe("123");
    editor.destroy();
  });

  it("does not convert when the column counts differ", () => {
    const editor = makePlainEditor("<p>head</p><p>|123|123|</p><p>|---|</p>");
    trigger(editor);
    expect(findTable(editor)).toBeNull();
    editor.destroy();
  });

  it("does not convert a delimiter row without a trailing pipe (no premature trigger)", () => {
    const editor = makePlainEditor("<p>head</p><p>|123|123|</p><p>|---|---</p>");
    trigger(editor);
    expect(findTable(editor)).toBeNull();
    editor.destroy();
  });
});
