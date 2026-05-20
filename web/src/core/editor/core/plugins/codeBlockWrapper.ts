import type { EditorView } from "@codemirror/view";

/**
 * Modulo-based code block wrapper using CSS classes.
 *
 * DOES NOT move DOM elements. Instead:
 * 1. Mark code block lines with 'in-code-block' class (background: transparent)
 * 2. Use :before pseudo-element on parent to show the background
 * 3. Or use CSS variables with fallback
 *
 * This avoids DOM manipulation issues with CodeMirror's DOMObserver.
 */

function countFences(text: string): number {
    const matches = text.match(/```/g);
    return matches ? matches.length : 0;
}

export function wrapCodeBlocks(view: EditorView): void {
    // Clean up previous state first
    unwrapCodeBlocks(view);

    const dom = view.dom;
    const allLines = dom.querySelectorAll('.cm-line');

    let inCodeBlock = false;
    let fenceCount = 0;
    let codeBlockStartIndex = -1;
    let codeBlockEndIndex = -1;

    interface CodeBlockRange {
        start: number;
        end: number;
    }
    const ranges: CodeBlockRange[] = [];

    // First pass: identify ranges without modifying DOM
    for (let i = 0; i < allLines.length; i++) {
        const line = allLines[i];
        const text = line.textContent || '';
        const fenceCountInLine = countFences(text);

        if (fenceCountInLine > 0) {
            fenceCount += fenceCountInLine;

            if (fenceCount % 2 === 1) {
                // Odd: start code block
                inCodeBlock = true;
                codeBlockStartIndex = i;
            } else {
                // Even: end code block
                codeBlockEndIndex = i;
                if (codeBlockStartIndex !== -1) {
                    ranges.push({ start: codeBlockStartIndex, end: codeBlockEndIndex });
                }
                inCodeBlock = false;
                fenceCount = 0;
                codeBlockStartIndex = -1;
                codeBlockEndIndex = -1;
            }
        }
    }

    // Second pass: mark lines with classes
    for (let i = 0; i < allLines.length; i++) {
        // Check if this line is within any range
        for (const range of ranges) {
            if (i >= range.start && i <= range.end) {
                allLines[i].classList.add('in-code-block');
                break;
            }
        }
    }

    // Add wrapper div at the document level (not wrapping individual lines)
    // This wrapper will provide the background color
    const existingWrapper = dom.querySelector('.md-code-block-container');
    if (existingWrapper) {
        existingWrapper.remove();
    }

    if (ranges.length > 0) {
        const container = document.createElement('div');
        container.className = 'md-code-block-container';

        // We'll use CSS to highlight code block regions
        // For now, just add a marker class to the editor
        dom.classList.add('has-code-blocks');
    }
}

export function unwrapCodeBlocks(view: EditorView): void {
    const dom = view.dom;

    // Remove class markers
    const markedLines = dom.querySelectorAll('.cm-line.in-code-block');
    for (const line of markedLines) {
        line.classList.remove('in-code-block');
    }

    // Remove container
    const container = dom.querySelector('.md-code-block-container');
    if (container) {
        container.remove();
    }

    dom.classList.remove('has-code-blocks');
}