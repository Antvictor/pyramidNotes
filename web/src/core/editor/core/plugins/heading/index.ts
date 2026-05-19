// Heading decoration logic
import type { Range } from "@codemirror/state";

export interface HeadingDecorations {
    level: number;
    markRange: Range<unknown> | null;
    contentRange: Range<unknown>;
}

export function getHeadingDecorations(
    from: number,
    to: number,
    text: string
): HeadingDecorations | null {
    const markMatch = text.match(/^(#{1,6}\s)/);
    if (!markMatch) return null;

    const markLength = markMatch[1].length;
    const level = markMatch[1].trim().length;

    return {
        level,
        markRange: { from, to: from + markLength } as Range<unknown>,
        contentRange: { from, to } as Range<unknown>,
    };
}

export function getHeadingClass(level: number): string {
    return `md-heading-content md-h${level}`;
}