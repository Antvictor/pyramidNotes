// Code block decoration logic
import type { Range } from "@codemirror/state";

export interface CodeBlockDecorations {
    fenceStartRange: Range<unknown> | null;
    fenceEndRange: Range<unknown> | null;
    contentRange: Range<unknown> | null;
}

export function getCodeBlockDecorations(
    from: number,
    to: number,
    text: string
): CodeBlockDecorations {
    const firstNewline = text.indexOf("\n");
    const lastNewline = text.lastIndexOf("\n");

    if (firstNewline > 0 && lastNewline > firstNewline) {
        const contentStart = from + firstNewline + 1;
        const contentEnd = from + lastNewline;

        return {
            fenceStartRange: { from, to: contentStart } as Range<unknown>,
            fenceEndRange: { from: contentEnd, to } as Range<unknown>,
            contentRange: { from: contentStart, to: contentEnd } as Range<unknown>,
        };
    }

    return {
        fenceStartRange: null,
        fenceEndRange: null,
        contentRange: null,
    };
}