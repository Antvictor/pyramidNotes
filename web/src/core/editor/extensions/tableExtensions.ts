import { Extension, type Editor } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";

import { MarkdownHardBreak } from "./markdownHardBreak";

// 单元格强制单段落：markdown 表格无法表达多块内容。默认 block+ 下，单元格内换行会
// 造出第二段 → tiptap-markdown 的 isMarkdownSerializable 返回 false → 回退输出 HTML →
// 编辑器 html:false 重解析时丢弃 → 丢表。
export const SingleBlockTableCell = TableCell.extend({ content: "paragraph" });
export const SingleBlockTableHeader = TableHeader.extend({ content: "paragraph" });

function selectionInTableCell(editor: Editor): boolean {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const name = $from.node(depth).type.name;
    if (name === "tableCell" || name === "tableHeader") return true;
  }
  return false;
}

// 单元格内 Enter 不产生第二段（单段落约束下本就无效，这里显式拦截以求确定）。
// Shift-Enter 放行：由 HardBreak 插入换行，序列化为 <br>（见 markdownHardBreak.ts）。
const TableCellGuard = Extension.create({
  name: "tableCellGuard",
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }: { editor: Editor }) => selectionInTableCell(editor),
    };
  },
});

// 分隔行必须以 | 结尾 —— 否则在敲到 `|---|---`（末尾 | 尚未输入）时就会提前转换。
const TABLE_DELIMITER_ROW = /^\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|$/;
const DELIMITER_CELL = /^:?-+:?$/;

// 去掉首尾竖线后按 | 切分；不含 | 的普通段落返回 null。
function parsePipeRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return null;
  let inner = trimmed;
  if (inner.startsWith("|")) inner = inner.slice(1);
  if (inner.endsWith("|")) inner = inner.slice(0, -1);
  const cells = inner.split("|").map((cell) => cell.trim());
  return cells.length ? cells : null;
}

// 逐字输入 pipe 表格时实时转成表格节点：扫描相邻的两个顶层段落，
// 上一段是表头行、下一段是分隔行且列数相等时替换为 table（含一行 tableHeader）。
// 之后 Tab 由 tiptap 原生 Table 扩展接管（末格自动 addRowAfter 加行）。
// 用 appendTransaction 与 InternalNodeTokenNormalizer / InlineCodePreview 同一套机制。
const TableAutoConvert = Extension.create({
  name: "tableAutoConvert",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("tableAutoConvert"),
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((transaction) => transaction.docChanged)) return null;

          const { doc, schema } = newState;
          const tableType = schema.nodes.table;
          const rowType = schema.nodes.tableRow;
          const headerType = schema.nodes.tableHeader;
          const paragraphType = schema.nodes.paragraph;
          if (!tableType || !rowType || !headerType || !paragraphType) return null;

          let pos = 0;
          for (let index = 0; index < doc.childCount - 1; index += 1) {
            const header = doc.child(index);
            const delimiter = doc.child(index + 1);
            const headerPos = pos;
            pos += header.nodeSize;

            if (header.type.name !== "paragraph" || delimiter.type.name !== "paragraph") continue;

            const delimiterText = delimiter.textContent.trim();
            if (!TABLE_DELIMITER_ROW.test(delimiterText)) continue;

            const delimiterCells = parsePipeRow(delimiterText);
            const headerCells = parsePipeRow(header.textContent);
            if (!delimiterCells || !headerCells) continue;
            if (delimiterCells.length !== headerCells.length) continue;
            if (!delimiterCells.every((cell) => DELIMITER_CELL.test(cell))) continue;

            const cells = headerCells.map((text) =>
              headerType.create(null, paragraphType.create(null, text ? schema.text(text) : null)),
            );
            const table = tableType.create(null, rowType.create(null, cells));

            const tr = newState.tr.replaceWith(
              headerPos,
              headerPos + header.nodeSize + delimiter.nodeSize,
              table,
            );
            tr.setSelection(TextSelection.near(tr.doc.resolve(headerPos + table.nodeSize - 1), -1));
            return tr;
          }

          return null;
        },
      }),
    ];
  },
});

export function createTableExtensions() {
  return [
    // resizable:false —— 列宽无法用 markdown 表示；
    // allowTableNodeSelection:true —— 让整表可被 NodeSelection 选中，从而能删除。
    Table.configure({ resizable: false, allowTableNodeSelection: true }),
    TableRow,
    SingleBlockTableHeader,
    SingleBlockTableCell,
    TableCellGuard,
    TableAutoConvert,
    // 单元格内换行用 <br> 承载（替换默认 HardBreak 的 markdown 存储）。
    // 需与 StarterKit.configure({ hardBreak: false }) 配套，避免重复注册。
    MarkdownHardBreak,
  ];
}
