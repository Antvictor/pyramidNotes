import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { describe, expect, it } from "vitest";

import { createTableExtensions } from "./tableExtensions";
import { TabIndentation } from "./tabIndentation";

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

function tableRowCount(editor: Editor): number {
  const table = editor.state.doc.firstChild;
  return table?.type.name === "table" ? table.childCount : -1;
}

function cellTextAt(editor: Editor): string {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const name = $from.node(depth).type.name;
    if (name === "tableCell" || name === "tableHeader") return $from.node(depth).textContent;
  }
  return "";
}

// 把光标放到内容为 text 的单元格内的文本末尾。
function placeInCellWithText(editor: Editor, text: string) {
  let target = -1;
  editor.state.doc.descendants((node, pos) => {
    if (target < 0 && node.isText && node.text === text) target = pos + node.text!.length;
    return undefined;
  });
  editor.commands.setTextSelection(target);
}

// 把光标放到表格第 rowIndex 行第一个单元格的内容起始处。
function placeInRowFirstCell(editor: Editor, rowIndex: number) {
  const table = editor.state.doc.firstChild!;
  let pos = 1; // 表格起始于 0，内容从 1 开始
  for (let index = 0; index < rowIndex; index += 1) pos += table.child(index).nodeSize;
  editor.commands.setTextSelection(pos + 3); // 行起点 →+1 到行内容 →+1 到格 →+1 到段落
}

describe("cell keyboard: Enter / Backspace", () => {
  it("Enter 在非末格：移到下一格、行数不变", () => {
    const editor = makeEditor(TABLE_MD);
    placeInCellWithText(editor, "1");
    expect(pressKey(editor, "Enter")).toBe(true);
    expect(tableRowCount(editor)).toBe(2);
    expect(cellTextAt(editor)).toBe("2");
    editor.destroy();
  });

  it("Enter 在末格：新增一行", () => {
    const editor = makeEditor(TABLE_MD);
    placeInCellWithText(editor, "2");
    expect(pressKey(editor, "Enter")).toBe(true);
    expect(tableRowCount(editor)).toBe(3);
    editor.destroy();
  });

  it("Enter 不在单元格内产生第二段", () => {
    const editor = makeEditor(TABLE_MD);
    placeInCellWithText(editor, "1");
    pressKey(editor, "Enter");
    expect(editor.state.doc.firstChild!.firstChild!.firstChild!.childCount).toBe(1);
    editor.destroy();
  });

  it("空行首格退格 → 删该行、光标到上一行末格", () => {
    const editor = makeEditor("| a | b |\n| --- | --- |\n|  |  |\n|  |  |");
    placeInRowFirstCell(editor, 1);
    expect(pressKey(editor, "Backspace")).toBe(true);
    expect(tableRowCount(editor)).toBe(2);
    expect(cellTextAt(editor)).toBe("b");
    editor.destroy();
  });

  it("多行表：空行首格退格逐行删，不删整表", () => {
    const editor = makeEditor("| a | b |\n| --- | --- |\n|  |  |");
    placeInRowFirstCell(editor, 1);
    expect(pressKey(editor, "Backspace")).toBe(true);
    expect(tableRowCount(editor)).toBe(1); // 只剩表头一行
    expect(editor.state.doc.firstChild?.type.name).toBe("table");
    editor.destroy();
  });

  it("仅剩一行(空)首格退格 → 删整表", () => {
    const editor = makeEditor("|  |  |\n| --- | --- |");
    placeInRowFirstCell(editor, 0);
    expect(pressKey(editor, "Backspace")).toBe(true);
    expect(editor.state.doc.firstChild?.type.name).not.toBe("table");
    editor.destroy();
  });

  it("有内容的行首格退格 → 跳到左侧单元格、不删行", () => {
    const editor = makeEditor(TABLE_MD);
    placeInRowFirstCell(editor, 1); // 位于 "1" 单元格起始
    expect(pressKey(editor, "Backspace")).toBe(true);
    expect(tableRowCount(editor)).toBe(2);
    expect(cellTextAt(editor)).toBe("b"); // 跳到左侧单元格（上一行末格）
    editor.destroy();
  });

  it("非首格起始退格 → 跳到左侧单元格", () => {
    const editor = makeEditor(TABLE_MD);
    placeInCellWithText(editor, "2"); // 光标在 "2" 末尾
    editor.commands.setTextSelection(editor.state.selection.from - 1); // 移到 "2" 起始
    expect(pressKey(editor, "Backspace")).toBe(true);
    expect(cellTextAt(editor)).toBe("1"); // 左侧单元格
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

// 含 TabIndentation 的编辑器（贴近 App 配置）。
function makeEditorWithTab(content: string) {
  return new Editor({
    extensions: [
      StarterKit.configure({ code: false, codeBlock: false, hardBreak: false }),
      ...createTableExtensions(),
      TabIndentation,
      Markdown.configure({ html: false }),
    ],
    content,
  });
}

describe("tab indentation", () => {
  it("段落 Tab → 插入两个空格且已处理", () => {
    const editor = makeEditorWithTab("hello");
    editor.commands.setTextSelection(6);
    expect(pressKey(editor, "Tab")).toBe(true);
    expect(editor.state.doc.firstChild!.textContent).toBe("hello  ");
    editor.destroy();
  });

  it("表格 Tab 行为不变（移到下一格）", () => {
    const editor = makeEditorWithTab(TABLE_MD);
    placeInCellWithText(editor, "1");
    expect(pressKey(editor, "Tab")).toBe(true);
    expect(cellTextAt(editor)).toBe("2");
    editor.destroy();
  });
});
