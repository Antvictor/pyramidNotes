import {
    ViewPlugin,
    Decoration,
    EditorView,
    ViewUpdate,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { parser as markdownParser } from "@lezer/markdown";
import { wrapCodeBlocks, unwrapCodeBlocks } from "./codeBlockWrapper";

// Node type names
const HEADING_NODE_NAMES = new Set([
    "ATXHeading1", "ATXHeading2", "ATXHeading3",
    "ATXHeading4", "ATXHeading5", "ATXHeading6",
    "SetextHeading1", "SetextHeading2",
]);
const BLOCKQUOTE = "Blockquote";
const LIST_ITEM = "ListItem";
const FENCED_CODE = "FencedCode";
const INLINE_CODE = "InlineCode";

function getHeadingLevel(nodeName: string): number {
    if (nodeName === "ATXHeading1" || nodeName === "SetextHeading1") return 1;
    if (nodeName === "ATXHeading2" || nodeName === "SetextHeading2") return 2;
    if (nodeName === "ATXHeading3") return 3;
    if (nodeName === "ATXHeading4") return 4;
    if (nodeName === "ATXHeading5") return 5;
    if (nodeName === "ATXHeading6") return 6;
    return 0;
}

export function markdownDecorationPlugin() {
    return ViewPlugin.fromClass(
        class {
            decorations;

            constructor(view: EditorView) {
                this.decorations = this.build(view);
                wrapCodeBlocks(view);
            }

            update(update: ViewUpdate) {
                if (update.docChanged || update.selectionSet || update.viewportChanged) {
                    this.decorations = this.build(update.view);
                    unwrapCodeBlocks(update.view);
                    wrapCodeBlocks(update.view);
                }
            }

            build(view: EditorView): any {
                const decorations: Array<{ from: number; to: number; class: string }> = [];
                const doc = view.state.doc.toString();
                const cursor = view.state.selection.main.head;

                const tree = markdownParser.parse(doc);

                tree.iterate({
                    enter(node) {
                        const from = node.from;
                        const to = node.to;
                        const name = node.name;
                        const text = doc.slice(from, to);

                        // ===========================================
                        // 行级元素：需要光标检测
                        // ===========================================

                        // 行内代码：光标在反引号位置时显示源码
                        if (name === INLINE_CODE) {
                            const cursorAtOpen = cursor === from;
                            const cursorAtClose = cursor === to;
                            const cursorJustAfterOpen = cursor === from + 1;
                            const cursorJustBeforeClose = cursor === to - 1;

                            if (cursorAtOpen || cursorAtClose || cursorJustAfterOpen || cursorJustBeforeClose) {
                                return; // 跳过 - 光标在反引号位置，显示源码
                            }
                            decorations.push({ from, to: from + 1, class: "md-syntax" });
                            decorations.push({ from: to - 1, to, class: "md-syntax" });
                            decorations.push({ from, to, class: "md-inline-code-content" });
                            return;
                        }

                        // 标题：光标在该标题行时显示源码
                        if (HEADING_NODE_NAMES.has(name)) {
                            const nodeLine = view.state.doc.lineAt(from);
                            const cursorLine = view.state.doc.lineAt(cursor);
                            if (nodeLine.number === cursorLine.number) {
                                return; // 跳过 - 光标在此标题行，显示源码
                            }
                            const markMatch = text.match(/^(#{1,6}\s)/);
                            if (markMatch) {
                                const markLength = markMatch[1].length;
                                decorations.push({ from, to: from + markLength, class: "md-syntax" });
                            }
                            decorations.push({ from, to, class: `md-heading-content md-h${getHeadingLevel(name)}` });
                            return;
                        }

                        // ===========================================
                        // 块级元素：不需要光标检测，始终应用样式
                        // ===========================================

                        // 引用块
                        if (name === BLOCKQUOTE) {
                            const markMatch = text.match(/^(>\s*)/);
                            if (markMatch) {
                                const markLength = markMatch[1].length;
                                decorations.push({ from, to: from + markLength, class: "md-syntax" });
                            }
                            decorations.push({ from, to, class: "md-blockquote-content" });
                            return { skip: true };
                        }

                        // 列表项
                        if (name === LIST_ITEM) {
                            // BUG FIX: [+\-*] makes - a range operator; put - first: [-+*]
                            const markMatch = text.match(/^(\s*[-+*]|\s*\d+\.|\s*\d+\))\s/);
                            const isOrdered = text.match(/^\s*\d+[.)]\s/);
                            if (markMatch) {
                                const markLength = markMatch[1].length;
                                // Only apply md-syntax hiding to unordered list markers
                                // For ordered lists, keep numbers visible as source text
                                if (!isOrdered) {
                                    decorations.push({ from, to: from + markLength, class: "md-syntax" });
                                }
                            }
                            const listClass = isOrdered ? "md-list-item-content md-list-ordered" : "md-list-item-content";
                            decorations.push({ from, to, class: listClass });
                            return;
                        }

                        // 代码块：始终显示```
                        if (name === FENCED_CODE) {
                            const firstNewline = text.indexOf("\n");
                            const lastNewline = text.lastIndexOf("\n");

                            if (firstNewline > 0 && lastNewline > firstNewline) {
                                const contentStart = from + firstNewline + 1;
                                const contentEnd = from + lastNewline;

                                // 始终显示围栏标记，不使用 md-syntax 隐藏
                                decorations.push({ from, to: contentStart, class: "md-fence-start" });
                                decorations.push({ from: contentEnd, to, class: "md-fence-end" });
                                // 内容区样式
                                decorations.push({ from: contentStart, to: contentEnd, class: "md-code-block-content" });
                            } else {
                                decorations.push({ from, to, class: "md-fence-start md-fence-end" });
                            }
                            return { skip: true };
                        }
                    }
                });

                decorations.sort((a, b) => {
                    if (a.from !== b.from) return a.from - b.from;
                    return a.to - b.to;
                });

                const builder = new RangeSetBuilder<Decoration>();
                for (const dec of decorations) {
                    builder.add(dec.from, dec.to, Decoration.mark({ class: dec.class }));
                }

                return builder.finish();
            }
        },
        {
            decorations: (v) => v.decorations,
        }
    );
}