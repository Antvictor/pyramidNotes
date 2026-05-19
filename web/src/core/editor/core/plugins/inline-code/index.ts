// Inline code decoration logic
import type { Range } from "@codemirror/state";

export interface InlineCodeDecorations {
    openMarkRange: Range<unknown>;
    closeMarkRange: Range<unknown>;
    contentRange: Range<unknown>;
}

export function getInlineCodeDecorations(
    from: number,
    to: number
): InlineCodeDecorations {
    return {
        openMarkRange: { from, to: from + 1 } as Range<unknown>,
        closeMarkRange: { from: to - 1, to } as Range<unknown>,
        contentRange: { from, to } as Range<unknown>,
    };
}