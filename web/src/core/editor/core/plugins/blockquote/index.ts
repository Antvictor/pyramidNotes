// Blockquote decoration logic
import type { Range } from "@codemirror/state";

export interface BlockquoteDecorations {
    markRange: Range<unknown> | null;
    contentRange: Range<unknown>;
}

export function getBlockquoteDecorations(
    from: number,
    to: number,
    text: string
): BlockquoteDecorations | null {
    const markMatch = text.match(/^(>\s*)/);
    if (!markMatch) return null;

    const markLength = markMatch[1].length;

    return {
        markRange: { from, to: from + markLength } as Range<unknown>,
        contentRange: { from, to } as Range<unknown>,
    };
}