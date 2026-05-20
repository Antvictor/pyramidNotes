import type { EditorView } from "@codemirror/view";

/**
 * Modulo-based code block wrapper using CSS classes.
 * Handles case where DOM lines aren't ready yet.
 */

function countFences(text: string): number {
    const matches = text.match(/```/g);
    return matches ? matches.length : 0;
}

interface CodeBlockRange {
    start: number;
    end: number;
}

function findCodeBlockRanges(doc: import("@codemirror/state").Document): CodeBlockRange[] {
    const ranges: CodeBlockRange[] = [];
    let fenceCount = 0;
    let codeBlockStartLine = -1;

    for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
        const line = doc.line(lineNum);
        const fenceCountInLine = countFences(line.text);

        if (fenceCountInLine > 0) {
            fenceCount += fenceCountInLine;

            if (fenceCount % 2 === 1) {
                codeBlockStartLine = lineNum;
            } else {
                if (codeBlockStartLine !== -1) {
                    ranges.push({ start: codeBlockStartLine, end: lineNum });
                }
                codeBlockStartLine = -1;
            }
        }
    }

    return ranges;
}

let pendingRetry: number | null = null;

export function wrapCodeBlocks(view: EditorView): void {
    const doc = view.state.doc;
    const dom = view.dom;

    // Cancel any pending retry to avoid stale callbacks
    if (pendingRetry !== null) {
        cancelAnimationFrame(pendingRetry);
        pendingRetry = null;
    }

    // Clean up first
    const markedLines = Array.from(dom.querySelectorAll('.cm-line.in-code-block'));
    for (const line of markedLines) {
        line.classList.remove('in-code-block');
        (line as HTMLElement).style.background = '';
    }

    // Find ranges from doc
    const ranges = findCodeBlockRanges(doc);

    if (ranges.length === 0) return;

    // Apply styles, with retry if DOM not ready
    applyCodeBlockStylesWithRetry(view, ranges);
}

function applyCodeBlockStylesWithRetry(view: EditorView, ranges: CodeBlockRange[]): void {
    const dom = view.dom;

    function apply(): boolean {
        const cmLines = dom.querySelectorAll('.cm-line');

        if (cmLines.length === 0) {
            console.warn('[applyCodeBlockStyles] cmLines is 0, will retry');
            return false;
        }

        for (const range of ranges) {
            for (let lineNum = range.start; lineNum <= range.end; lineNum++) {
                const index = lineNum - 1;
                if (index >= 0 && index < cmLines.length) {
                    const el = cmLines[index] as HTMLElement;
                    el.classList.add('in-code-block');
                    el.style.background = 'rgb(180, 180, 180)';
                } else {
                    console.warn(`[applyCodeBlockStyles] OUT OF BOUNDS: lineNum=${lineNum}, index=${index}, cmLines.length=${cmLines.length}`);
                }
            }
        }
        return true;
    }

    if (!apply()) {
        let retryCount = 0;
        function retry() {
            retryCount++;
            if (retryCount >= 5) {
                console.warn('[applyCodeBlockStyles] giving up after 5 retries');
                return;
            }
            requestAnimationFrame(() => {
                // Use fresh view reference to get current document state
                if (!apply()) {
                    retry();
                }
            });
        }
        retry();
    }
}

export function unwrapCodeBlocks(view: EditorView): void {
    const dom = view.dom;

    const markedLines = Array.from(dom.querySelectorAll('.cm-line.in-code-block'));
    for (const line of markedLines) {
        line.classList.remove('in-code-block');
        (line as HTMLElement).style.background = '';
    }
}