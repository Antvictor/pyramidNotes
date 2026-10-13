import { Extension, type Editor } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";

import { MarkdownHardBreak } from "./markdownHardBreak";

// 单元格强制单段落：markdown 表格无法表达多块内容。默认 block+ 下，单元格内换行会
// 造出第二段 → tiptap-markdown 的 isMarkdownSerializable 返回 false → 回退输出 HTML →
// 编辑器 html:false 重解析时丢弃 → 丢表。
export const SingleBlockTableCell = TableCell.extend({ content: "paragraph" });
export const SingleBlockTableHeader = TableHeader.extend({ content: "paragraph" });

// 光标所在单元格的行/列上下文；不在单元格内返回 null。
function getTableCellContext(editor: Editor) {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const name = $from.node(depth).type.name;
    if (name === "tableCell" || name === "tableHeader") {
      return {
        cellDepth: depth,
        rowIndex: $from.index(depth - 2),
        cellIndex: $from.index(depth - 1),
        row: $from.node(depth - 1),
        table: $from.node(depth - 2),
      };
    }
  }
  return null;
}

function selectionInTableCell(editor: Editor): boolean {
  return getTableCellContext(editor) !== null;
}

// 单元格内编辑键：
// - Enter：先右后下（与 Table 扩展 Tab 一致）——移到下一格，末格新增一行并进入；不产生第二段。
// - Backspace：在单元格内容起始（分隔线）处——整行为空且在首格时逐行删除（仅当只剩最后一行时删整表），
//   否则跳到左侧单元格；不在起始处则交默认删字符。
// Shift-Enter 仍由 HardBreak 插入 <br>（见 markdownHardBreak.ts）。
const TableCellKeymap = Extension.create({
  name: "tableCellGuard",
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }: { editor: Editor }) => {
        if (!selectionInTableCell(editor)) return false;
        if (editor.commands.goToNextCell()) return true;
        if (!editor.can().addRowAfter()) return false;
        return editor.chain().addRowAfter().goToNextCell().run();
      },
      Backspace: ({ editor }: { editor: Editor }) => {
        const { selection } = editor.state;
        if (!selection.empty) return false;

        const context = getTableCellContext(editor);
        if (!context) return false;
        const { cellDepth, rowIndex, cellIndex, row, table } = context;
        const { $from } = selection;
        // 只在单元格内容起始（分隔线）处接管；否则交给默认（删除字符）。
        if ($from.parentOffset !== 0) return false;

        // 整行为空且在首格：逐行删除；仅当表格只剩这一行时才删整表。
        if (cellIndex === 0) {
          let rowEmpty = true;
          row.forEach((cell) => {
            if (cell.textContent.length > 0) rowEmpty = false;
          });
          if (rowEmpty) {
            if (table.childCount === 1) {
              return editor.commands.deleteTable();
            }
            if (rowIndex >= 1) {
              const tableStart = $from.start(cellDepth - 2);
              let prevRowStart = tableStart;
              for (let index = 0; index < rowIndex - 1; index += 1) {
                prevRowStart += table.child(index).nodeSize;
              }
              const prevRow = table.child(rowIndex - 1);
              const targetPos = prevRowStart + prevRow.nodeSize - 3;
              return editor.chain().deleteRow().setTextSelection(targetPos).run();
            }
          }
        }

        // 单元格内容起始处退格：跳到左侧单元格（阅读顺序的上一个）。
        return editor.commands.goToPreviousCell();
      },
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
    TableCellKeymap,
    TableAutoConvert,
    // 单元格内换行用 <br> 承载（替换默认 HardBreak 的 markdown 存储）。
    // 需与 StarterKit.configure({ hardBreak: false }) 配套，避免重复注册。
    MarkdownHardBreak,
  ];
}
