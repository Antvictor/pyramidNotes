import {
    ViewPlugin,
    Decoration,
    EditorView,
    ViewUpdate,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { parser as markdownParser } from "@lezer/markdown";

// Node type names from @lezer/markdown
const HEADING_NODE_NAMES = new Set([
    "ATXHeading1", "ATXHeading2", "ATXHeading3",
    "ATXHeading4", "ATXHeading5", "ATXHeading6",
    "SetextHeading1", "SetextHeading2",
]);
const BLOCKQUOTE = "Blockquote";
const LIST_ITEM = "ListItem";
const FENCED_CODE = "FencedCode";

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
            }

            update(update: ViewUpdate) {
                if (update.docChanged || update.selectionSet || update.viewportChanged) {
                    this.decorations = this.build(update.view);
                }
            }

            build(view: EditorView): any {
                // Collect decorations first, then sort
                const decorations: Array<{ from: number; to: number; class: string }> = [];
                const doc = view.state.doc.toString();
                const cursor = view.state.selection.main.head;

                // Parse the document using Lezer markdown parser
                const tree = markdownParser.parse(doc);

                // Iterate and collect decorations
                tree.iterate({
                    enter(node) {
                        const from = node.from;
                        const to = node.to;
                        const name = node.name;
                        const text = doc.slice(from, to);

                        // Skip nodes that contain the cursor (show source for editing line)
                        if (cursor >= from && cursor <= to) return;

                        // Handle headings - mark # as invisible, add heading style to content
                        if (HEADING_NODE_NAMES.has(name)) {
                            const level = getHeadingLevel(name);
                            const markMatch = text.match(/^(#{1,6}\s)/);
                            if (markMatch) {
                                const markLength = markMatch[1].length;
                                decorations.push({ from, to: from + markLength, class: "md-syntax" });
                            }
                            decorations.push({ from, to, class: `md-heading-content md-h${level}` });
                            return;
                        }

                        // Handle blockquotes - hide > marker
                        if (name === BLOCKQUOTE) {
                            const markMatch = text.match(/^(>\s*)/);
                            if (markMatch) {
                                const markLength = markMatch[1].length;
                                decorations.push({ from, to: from + markLength, class: "md-syntax" });
                            }
                            decorations.push({ from, to, class: "md-blockquote-content" });
                            // Skip children - don't process Paragraphs inside the blockquote separately
                            return { skip: true };
                        }

                        // Handle list items - hide marker
                        if (name === LIST_ITEM) {
                            const markMatch = text.match(/^(\s*[+\-*]|\s*\d+\.|\s*\d+\))\s/);
                            if (markMatch) {
                                const markLength = markMatch[1].length;
                                decorations.push({ from, to: from + markLength, class: "md-syntax" });
                            }
                            // Detect if ordered (1. or 1)) or unordered (+ - *)
                            const isOrdered = text.match(/^\s*\d+[.)]/);
                            const listClass = isOrdered ? "md-list-item-content md-list-ordered" : "md-list-item-content";
                            decorations.push({ from, to, class: listClass });
                            return;
                        }

                        // Handle fenced code blocks - hide ``` markers
                        if (name === FENCED_CODE) {
                            const firstNewline = text.indexOf("\n");
                            const lastNewline = text.lastIndexOf("\n");

                            // Only apply styling to the content between fences (not the fences themselves)
                            if (firstNewline > 0 && lastNewline > firstNewline) {
                                const contentStart = from + firstNewline + 1;
                                const contentEnd = from + lastNewline;
                                decorations.push({ from, to: contentStart, class: "md-syntax" });
                                decorations.push({ from: contentEnd, to, class: "md-syntax" });
                                // Apply code block style only to the content, not fences
                                decorations.push({ from: contentStart, to: contentEnd, class: "md-code-block-content" });
                            } else {
                                // Fallback: just hide the entire thing as syntax
                                decorations.push({ from, to, class: "md-syntax" });
                            }
                            return { skip: true };
                        }

                        // Handle inline code
                        if (name === "InlineCode") {
                            decorations.push({ from, to: from + 1, class: "md-syntax" });
                            decorations.push({ from: to - 1, to, class: "md-syntax" });
                            decorations.push({ from, to, class: "md-inline-code-content" });
                            return;
                        }
                    }
                });

                // Sort decorations by from position (and to for tie-breaking)
                decorations.sort((a, b) => {
                    if (a.from !== b.from) return a.from - b.from;
                    return a.to - b.to;
                });

                // Build decorations in sorted order
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