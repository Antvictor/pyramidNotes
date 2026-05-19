// List decoration logic
import type { Range } from "@codemirror/state";

export interface ListDecorations {
    markRange: Range<unknown> | null;
    contentClass: string;
}

export function getListDecorations(
    from: number,
    to: number,
    text: string
): ListDecorations | null {
    const markMatch = text.match(/^(\s*[+\-*]|\s*\d+\.|\s*\d+\))\s/);
    if (!markMatch) return null;

    const markLength = markMatch[1].length;
    const isOrdered = text.match(/^\s*\d+[.)]/);

    return {
        markRange: { from, to: from + markLength } as Range<unknown>,
        contentClass: isOrdered ? "md-list-item-content md-list-ordered" : "md-list-item-content",
    };
}