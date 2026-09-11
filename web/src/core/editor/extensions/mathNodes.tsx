import { InputRule, mergeAttributes, Node, type Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { TextSelection, type Transaction } from "@tiptap/pm/state";
import type { MarkdownSerializerState } from "prosemirror-markdown";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import katex from "katex";

// ---- InputRule 正则 ----
// 开 $ 前一位不能是字母/数字(CJK 含内)/$/\ —— 货币安全;内容首尾不能是空白
export const MATH_INLINE_INPUT_REGEX =
  /(?<![\p{L}\p{N}$\\])\$([^$\s](?:[^$\n]*[^$\s])?)\$$/u;

export const MATH_BLOCK_INPUT_REGEX = /(?<=^|[^$])\$\$$/;

// ---- 属性编解码 ----
export function encodeLatexAttr(latex: string) {
  return encodeURIComponent(latex);
}

export function decodeLatexAttr(value: string | null) {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// ---- markdown-it 类型(最小化,模式同 InternalNodeLink.tsx 的 MarkdownItLike) ----
interface MathToken {
  attrs: Array<[string, string]> | null;
  content: string;
  block?: boolean;
  map?: [number, number] | null;
  attrGet: (name: string) => string | null;
}

interface MathInlineState {
  src: string;
  pos: number;
  push: (type: string, tag: string, nesting: number) => MathToken;
}

interface MathBlockState {
  src: string;
  bMarks: number[];
  tShift: number[];
  eMarks: number[];
  line: number;
  push: (type: string, tag: string, nesting: number) => MathToken;
}

interface MarkdownItLike {
  inline: {
    ruler: {
      before: (
        afterName: string,
        ruleName: string,
        fn: (state: MathInlineState, silent: boolean) => boolean,
      ) => void;
    };
  };
  block: {
    ruler: {
      before: (
        afterName: string,
        ruleName: string,
        fn: (
          state: MathBlockState,
          startLine: number,
          endLine: number,
          silent: boolean,
        ) => boolean,
      ) => void;
    };
  };
  renderer: {
    rules: Record<string, (tokens: MathToken[], idx: number) => string>;
  };
}

// ---- markdown-it 语法注册(幂等,模式同 registerInternalNodeSyntax) ----
// 依据:markdown-it 内联链中 escape / code-span 规则先于 image,
// 因此 \$ 转义与行内代码 `$x$` 天然安全;$ 是 markdown-it 的 terminator char,
// 文本规则会在 $ 处停下交出控制权。
export function registerMathSyntax(markdownit: unknown) {
  const md = markdownit as MarkdownItLike & { __mathSyntaxRegistered?: boolean };
  if (md.__mathSyntaxRegistered) return;
  md.__mathSyntaxRegistered = true;

  md.inline.ruler.before("image", "math_inline", (state, silent) => {
    const src = state.src;
    const pos = state.pos;
    if (src.charCodeAt(pos) !== 0x24) return false; // $
    if (pos > 0 && /[\p{L}\p{N}$\\]/u.test(src[pos - 1])) return false;

    const end = src.indexOf("$", pos + 1);
    if (end < 0) return false;
    const content = src.slice(pos + 1, end);
    if (!content || content.includes("\n")) return false;
    if (/\s/.test(content[0]) || /\s$/.test(content)) return false;
    if (silent) return true;

    const token = state.push("math_inline", "", 0);
    token.attrs = [["data-latex", encodeLatexAttr(content)]];
    token.content = content;
    state.pos = end + 1;
    return true;
  });

  md.renderer.rules.math_inline = (tokens, idx) => {
    const latex = tokens[idx].attrGet("data-latex") || "";
    return `<math-inline data-latex="${latex}"></math-inline>`;
  };

  md.block.ruler.before("fence", "math_block", (state, startLine, endLine, silent) => {
    const startPos = state.bMarks[startLine] + state.tShift[startLine];
    const max = state.eMarks[startLine];
    const lineText = state.src.slice(startPos, max);
    if (!lineText.startsWith("$$")) return false;
    if (silent) return true;

    let content: string;
    let lastLine = startLine;
    const sameLineClose = lineText.indexOf("$$", 2);
    if (sameLineClose >= 2 && lineText.slice(sameLineClose + 2).trim() === "") {
      content = lineText.slice(2, sameLineClose);
    } else {
      content = lineText.slice(2);
      let closed = false;
      for (let line = startLine + 1; line < endLine; line++) {
        const lpos = state.bMarks[line] + state.tShift[line];
        const lmax = state.eMarks[line];
        const ltext = state.src.slice(lpos, lmax);
        const close = ltext.indexOf("$$");
        if (close >= 0 && ltext.slice(close + 2).trim() === "") {
          if (close > 0) content += "\n" + ltext.slice(0, close);
          lastLine = line;
          closed = true;
          break;
        }
        content += "\n" + ltext;
        lastLine = line;
      }
      if (!closed) return false;
    }

    const token = state.push("math_block", "", 0);
    token.block = true;
    token.attrs = [["data-latex", encodeLatexAttr(content)]];
    token.content = content;
    token.map = [startLine, lastLine + 1];
    state.line = lastLine + 1;
    return true;
  });

  md.renderer.rules.math_block = (tokens, idx) => {
    const latex = tokens[idx].attrGet("data-latex") || "";
    return `<math-block data-latex="${latex}"></math-block>`;
  };
}

// ---- KaTeX 包装 ----
export function renderKatex(
  latex: string,
  displayMode: boolean,
): { html: string; error: string | null } {
  if (!latex.trim()) return { html: "", error: null };
  try {
    return {
      html: katex.renderToString(latex, {
        displayMode,
        throwOnError: true,
        strict: false,
        trust: false,
      }),
      error: null,
    };
  } catch (error) {
    return { html: "", error: error instanceof Error ? error.message : String(error) };
  }
}

// ================= 行内公式 =================

type MathPMNode = ProseMirrorNode & { attrs: { latex?: string } };

export const MathInline = Node.create({
  name: "mathInline",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (element: HTMLElement) => decodeLatexAttr(element.getAttribute("data-latex")),
        renderHTML: (attributes: { latex?: string }) => ({
          "data-latex": encodeLatexAttr(attributes.latex || ""),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "math-inline" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["math-inline", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(({ node, updateAttributes, editor }) => {
      const { t } = useTranslation();
      const latex = (node.attrs.latex as string) || "";
      const [editing, setEditing] = useState(false);
      const [draft, setDraft] = useState("");
      const inputRef = useRef<HTMLInputElement | null>(null);
      const cancelledRef = useRef(false);

      useEffect(() => {
        if (editing) requestAnimationFrame(() => inputRef.current?.select());
      }, [editing]);

      const startEdit = () => {
        if (!editor.isEditable) return;
        cancelledRef.current = false;
        setDraft(latex);
        setEditing(true);
      };
      const commit = () => {
        if (cancelledRef.current) return;
        setEditing(false);
        const next = draft.trim();
        if (next && next !== latex) updateAttributes({ latex: next });
      };
      const cancel = () => {
        cancelledRef.current = true;
        setEditing(false);
      };

      if (editing) {
        return (
          <NodeViewWrapper as="span" className="math-inline-view math-inline-view-editing" contentEditable={false}>
            <input
              ref={inputRef}
              className="math-inline-source-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commit();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  cancel();
                }
              }}
              onBlur={commit}
            />
          </NodeViewWrapper>
        );
      }

      if (!latex.trim()) {
        return (
          <NodeViewWrapper
            as="span"
            className="math-inline-view math-inline-view-empty"
            contentEditable={false}
            onDoubleClick={startEdit}
          >
            {t("editor.editSource")}
          </NodeViewWrapper>
        );
      }

      const { html, error } = renderKatex(latex, false);
      if (error) {
        return (
          <NodeViewWrapper
            as="span"
            className="math-inline-view math-inline-view-error"
            contentEditable={false}
            title={latex}
            onDoubleClick={startEdit}
          >
            {t("editor.mathRenderError")}: {latex}
          </NodeViewWrapper>
        );
      }

      return (
        <NodeViewWrapper
          as="span"
          className="math-inline-view"
          contentEditable={false}
          dangerouslySetInnerHTML={{ __html: html }}
          onDoubleClick={startEdit}
        />
      );
    });
  },

  addInputRules() {
    return [
      // 不用 nodeInputRule:它在 match[1] 存在时只替换捕获组范围,
      // 两侧 $ 定界符会残留为文本;这里替换完整匹配区间。
      new InputRule({
        find: MATH_INLINE_INPUT_REGEX,
        handler: ({ state, range, match }) => {
          state.tr.replaceWith(
            range.from,
            range.to,
            this.type.create({ latex: match[1] || "" }),
          );
        },
      }),
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownSerializerState, node: MathPMNode) {
          state.write(`$${node.attrs.latex || ""}$`);
        },
        parse: {
          setup(markdownit: unknown) {
            registerMathSyntax(markdownit);
          },
        },
      },
    };
  },
});

// ================= 块级公式 =================

// ---- 外部边界删除进入编辑的通信 meta ----
// mathBlock 是 atom:相邻段落的行首 Backspace / 行尾 Delete 原生会直接删掉整个节点,
// 与原生代码块"删除键进入块内编辑"的体验不一致。这里改为派发带 meta 的事务,
// 由对应 NodeView 监听到后进入编辑态。
const MATH_BLOCK_EDIT_META = "mathBlockEnterEdit";

// 进入编辑时 textarea 光标落在哪一端,对齐原生代码块边界删除后的光标位置:
// 从下方段落行首 Backspace 进块 → 源码末尾;从上方段落行尾 Delete 进块 → 源码开头。
// atom 节点没有「内部」位置,PM 选区进不去,所以只能靠 meta 把方向带给 NodeView。
type MathBlockCaret = "start" | "end";

function enterAdjacentMathBlock(editor: Editor, direction: "backward" | "forward"): boolean {
  const { state } = editor;
  const { empty, $from } = state.selection;
  if (!empty || !$from.parent.isTextblock || $from.parent.type.spec.code) return false;

  let pos: number;
  let node: ProseMirrorNode | null;
  if (direction === "backward") {
    if ($from.parentOffset !== 0) return false;
    const boundary = $from.before($from.depth);
    node = state.doc.resolve(boundary).nodeBefore;
    if (!node) return false;
    pos = boundary - node.nodeSize;
  } else {
    if ($from.parentOffset !== $from.parent.content.size) return false;
    const boundary = $from.after($from.depth);
    node = state.doc.resolve(boundary).nodeAfter;
    if (!node) return false;
    pos = boundary;
  }
  if (node.type.name !== "mathBlock") return false;

  if (((node.attrs.latex as string) || "").trim().length === 0) {
    // 空块:直接删除(与空代码块的删除语义一致)
    const tr = state.tr.delete(pos, pos + node.nodeSize);
    tr.setSelection(TextSelection.near(tr.doc.resolve(pos), direction === "backward" ? 1 : -1));
    editor.view.dispatch(tr.scrollIntoView());
    return true;
  }

  const caret: MathBlockCaret = direction === "backward" ? "end" : "start";
  editor.view.dispatch(
    state.tr.setMeta(MATH_BLOCK_EDIT_META, { pos, caret }).scrollIntoView(),
  );
  return true;
}

export const MathBlock = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (element: HTMLElement) => decodeLatexAttr(element.getAttribute("data-latex")),
        renderHTML: (attributes: { latex?: string }) => ({
          "data-latex": encodeLatexAttr(attributes.latex || ""),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "math-block" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["math-block", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(({ node, updateAttributes, editor, selected, getPos }) => {
      const { t } = useTranslation();
      const latex = (node.attrs.latex as string) || "";
      // 空 latex(输入 $$ 建块 / 打开空公式块)→ 初始即编辑态;非可编辑编辑器不进入
      const [editing, setEditing] = useState(() => !latex.trim() && editor.isEditable);
      const [draft, setDraft] = useState(latex);
      const taRef = useRef<HTMLTextAreaElement | null>(null);
      const cancelledRef = useRef(false);
      // 本次进入编辑后光标该落在哪一端。新挂载的 textarea 默认偏移 0,
      // 只 focus() 会让「从下方 Backspace 进块」也停在首行行首(用户报告)。
      const caretRef = useRef<MathBlockCaret>("end");

      useEffect(() => {
        if (!editing) return;
        const frame = requestAnimationFrame(() => {
          const ta = taRef.current;
          if (!ta) return;
          ta.focus();
          const index = caretRef.current === "start" ? 0 : ta.value.length;
          ta.setSelectionRange(index, index);
        });
        return () => cancelAnimationFrame(frame);
      }, [editing]);

      const startEdit = (caret: MathBlockCaret = "end") => {
        if (!editor.isEditable) return;
        cancelledRef.current = false;
        caretRef.current = caret;
        setDraft(latex);
        setEditing(true);
      };
      const commit = () => {
        if (cancelledRef.current) return;
        setEditing(false);
        const next = draft.trim();
        if (next && next !== latex) updateAttributes({ latex: next });
      };
      const cancel = () => {
        cancelledRef.current = true;
        setEditing(false);
      };

      // 删除自身:替换为空段落并把光标放进去(对齐空代码块的删除行为)
      const deleteSelf = () => {
        const pos = typeof getPos === "function" ? getPos() : undefined;
        if (pos == null) return;
        cancelledRef.current = true;
        const { state, dispatch } = editor.view;
        const paragraph = state.schema.nodes.paragraph;
        if (!paragraph) return;
        const tr = state.tr.replaceWith(pos, pos + node.nodeSize, paragraph.create());
        tr.setSelection(TextSelection.near(tr.doc.resolve(pos), 1));
        dispatch(tr.scrollIntoView());
        // 焦点元素(textarea)已随节点卸载,不还焦点给编辑器就看不见光标
        editor.view.focus();
      };

      // 连续回车退出(对齐原生代码块 exitOnTripleEnter):末尾已是两连换行时再回车 → 去掉空行并退出
      const exitByTripleEnter = () => {
        cancelledRef.current = true;
        const next = draft.replace(/\n+$/, "");
        setEditing(false);
        if (next !== latex) updateAttributes({ latex: next });
        const pos = typeof getPos === "function" ? getPos() : undefined;
        if (pos == null) return;
        const { state, dispatch } = editor.view;
        const after = pos + node.nodeSize;
        if (after <= state.doc.content.size) {
          dispatch(
            state.tr.setSelection(TextSelection.near(state.doc.resolve(after), 1)).scrollIntoView(),
          );
        }
        // setEditing(false) 卸载了持有焦点的 textarea;不把 DOM 焦点还给编辑器,
        // PM 选区虽已落在块之后,页面上却看不到光标
        editor.view.focus();
      };

      // textarea 在外层 dom 内,按键会冒泡到 ProseMirror(view.dom):必须在 textarea 上用原生
      // 监听抢先处理并 stopPropagation,否则 PM 会用旧选区执行默认删除键(可能直接删掉整块)。
      useEffect(() => {
        if (!editing) return;
        const ta = taRef.current;
        if (!ta) return;
        const onKeyDown = (event: KeyboardEvent) => {
          if (event.key === "Escape") {
            event.preventDefault();
            cancel();
            return;
          }
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            commit();
            return;
          }
          if (event.key === "Enter" && !event.shiftKey) {
            const atEnd =
              ta.selectionStart === ta.value.length && ta.selectionEnd === ta.value.length;
            if (atEnd && ta.value.endsWith("\n\n")) {
              event.preventDefault();
              event.stopPropagation();
              exitByTripleEnter();
            }
            return;
          }
          if ((event.key === "Backspace" || event.key === "Delete") && ta.value.length === 0) {
            event.preventDefault();
            event.stopPropagation();
            deleteSelf();
          }
        };
        ta.addEventListener("keydown", onKeyDown);
        return () => ta.removeEventListener("keydown", onKeyDown);
      });

      // 外部边界删除:扩展派发带 meta 的事务,本视图收到后进入编辑态
      useEffect(() => {
        const onTransaction = ({ transaction }: { transaction: Transaction }) => {
          const meta = transaction.getMeta(MATH_BLOCK_EDIT_META) as
            | { pos: number; caret: MathBlockCaret }
            | undefined;
          if (meta == null) return;
          const pos = typeof getPos === "function" ? getPos() : undefined;
          if (pos != null && meta.pos === pos) startEdit(meta.caret);
        };
        editor.on("transaction", onTransaction);
        return () => {
          editor.off("transaction", onTransaction);
        };
      });

      if (editing) {
        return (
          <NodeViewWrapper
            className={`math-block-view math-block-view-editing${selected ? " is-selected" : ""}`}
            contentEditable={false}
          >
            <textarea
              ref={taRef}
              className="math-block-source-input"
              value={draft}
              rows={Math.max(3, (draft.match(/\n/g)?.length ?? 0) + 2)}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commit}
            />
          </NodeViewWrapper>
        );
      }

      if (!latex.trim()) {
        return (
          <NodeViewWrapper
            className="math-block-view math-block-view-empty"
            contentEditable={false}
            onDoubleClick={startEdit}
          >
            {t("editor.editSource")}
          </NodeViewWrapper>
        );
      }

      const { html, error } = renderKatex(latex, true);
      if (error) {
        return (
          <NodeViewWrapper
            className="math-block-view math-block-view-error"
            contentEditable={false}
            onDoubleClick={startEdit}
          >
            <div className="rendered-code-error">
              {t("editor.mathRenderError")}: {error}
            </div>
            <pre className="math-error-source">{latex}</pre>
          </NodeViewWrapper>
        );
      }

      return (
        <NodeViewWrapper
          className={`math-block-view${selected ? " is-selected" : ""}`}
          contentEditable={false}
          dangerouslySetInnerHTML={{ __html: html }}
          onDoubleClick={startEdit}
        />
      );
    });
  },

  addInputRules() {
    return [
      // 不用 nodeInputRule:块节点的 else 分支会先 insert 再 delete,
      // 在行内触发时段落被拆开并残留空段落。这里:
      // - 整行就是 $$(空行输入的常见路径)→ 直接替换整段,无残留空段
      // - 行中触发(如 foo $$)→ 仅替换匹配区间,由 ProseMirror 拆段
      new InputRule({
        find: MATH_BLOCK_INPUT_REGEX,
        handler: ({ state, range }) => {
          const { tr } = state;
          const $from = state.doc.resolve(range.from);
          const node = this.type.create({ latex: "" });
          if (range.from === $from.start() && range.to === $from.end()) {
            tr.replaceWith($from.before($from.depth), $from.after($from.depth), node);
          } else {
            tr.replaceWith(range.from, range.to, node);
          }
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      // 紧贴 mathBlock 的边界删除:进入编辑态而非删除节点(atom 原生会被直接删掉)
      Backspace: ({ editor }) => enterAdjacentMathBlock(editor, "backward"),
      Delete: ({ editor }) => enterAdjacentMathBlock(editor, "forward"),
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownSerializerState, node: MathPMNode) {
          state.write(`$$\n${node.attrs.latex || ""}\n$$`);
          state.closeBlock(node);
        },
        parse: {
          setup(markdownit: unknown) {
            registerMathSyntax(markdownit);
          },
        },
      },
    };
  },
});
