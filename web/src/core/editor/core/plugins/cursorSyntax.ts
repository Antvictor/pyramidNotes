import { EditorView, Decoration } from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";

// Map node names to Chinese display names
const SYNTAX_NAMES: Record<string, string> = {
    ATXHeading1: "一级标题",
    ATXHeading2: "二级标题",
    ATXHeading3: "三级标题",
    ATXHeading4: "四级标题",
    ATXHeading5: "五级标题",
    ATXHeading6: "六级标题",
    SetextHeading1: "一级标题",
    SetextHeading2: "二级标题",
    Blockquote: "引用块",
    BulletList: "无序列表",
    OrderedList: "有序列表",
    ListItem: "列表项",
    InlineCode: "行内代码",
    FencedCode: "代码块",
    CodeBlock: "代码块",
    Paragraph: "段落",
    StrongEmphasis: "粗体",
    Emphasis: "斜体",
    Link: "链接",
};

function getNodeDisplayName(view: EditorView): string {
    const pos = view.state.selection.main.head;
    const tree = syntaxTree(view.state);

    // Find the smallest node that contains the cursor position
    let nodeAtCursor: { name: string; from: number; to: number } | null = null;

    tree.iterate((node) => {
        if (node.from <= pos && node.to >= pos) {
            if (!nodeAtCursor || (node.to - node.from) < (nodeAtCursor.to - nodeAtCursor.from)) {
                nodeAtCursor = { name: node.name, from: node.from, to: node.to };
            }
        }
    });

    if (nodeAtCursor) {
        return SYNTAX_NAMES[nodeAtCursor.name] || nodeAtCursor.name;
    }

    // Fallback: check line content for common patterns
    const line = view.state.doc.lineAt(pos);
    const text = line.text.trim();

    if (text.startsWith("#")) return "标题";
    if (text.startsWith(">")) return "引用块";
    if (text.match(/^[-*+]\s/)) return "列表项";
    if (text.match(/^\d+\.\s/) || text.match(/^\d+\)\s/)) return "列表项";
    if (text.startsWith("```")) return "代码块";

    return "文本";
}

export function cursorSyntaxIndicator(onSyntaxChange: (syntax: string) => void) {
    let lastSyntax = "";

    return EditorView.updateListener.of((view) => {
        if (view.selectionSet || view.docChanged) {
            const syntax = getNodeDisplayName(view);
            if (syntax !== lastSyntax) {
                lastSyntax = syntax;
                onSyntaxChange(syntax);
            }
        }
    });
}

export function getCurrentSyntax(view: EditorView): string {
    return getNodeDisplayName(view);
}