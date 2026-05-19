// Base auto-continue input handler
// Coordinates different auto-continue strategies: lists, blockquotes, code blocks

import { EditorView } from "@codemirror/view";

export interface AutoContinueStrategy {
  name: string;
  match: (lineText: string) => boolean;
  isEmptyCancelable?: boolean;
  getContinuation: (lineText: string) => string | null;
  cancel?: (view: EditorView, from: number, to: number, lineText: string) => boolean;
}

const strategies: AutoContinueStrategy[] = [];

// Track if the previous input was an empty item from any strategy
let lastWasEmptyItem = false;
let lastStrategyName: string | null = null;

export function registerStrategy(strategy: AutoContinueStrategy) {
  strategies.push(strategy);
}

// Main input handler
export const autoContinue = EditorView.inputHandler.of(
  (view, from, to, text) => {
    if (text === "\n") {
      const line = view.state.doc.lineAt(from);
      const lineText = line.text;

      // Check each strategy
      for (const strategy of strategies) {
        if (strategy.match(lineText)) {
          const isEmpty = lineText.trim().length <= getMarkerLength(lineText, strategy);

          // Check if previous was an empty item from same strategy and this one is also empty
          if (lastWasEmptyItem && lastStrategyName === strategy.name && isEmpty) {
            // Cancel: remove the marker and just insert newline
            lastWasEmptyItem = false;
            lastStrategyName = null;
            if (strategy.cancel) {
              strategy.cancel(view, from, line.to, lineText);
            } else {
              view.dispatch({
                changes: { from, insert: "\n" },
              });
            }
            return true;
          }

          // Track state
          lastWasEmptyItem = isEmpty;
          lastStrategyName = strategy.name;

          // For blockquote: if line has content, continue on Enter
          // For list: always continue
          const continuation = strategy.getContinuation(lineText);
          if (continuation) {
            view.dispatch({
              changes: { from, insert: `\n${continuation}` },
            });
            return true;
          }
        }
      }

      // Reset state if not on a continuation line
      lastWasEmptyItem = false;
      lastStrategyName = null;
    }
    return false;
  }
);

// Helper to estimate marker length for empty check
function getMarkerLength(lineText: string, strategy: AutoContinueStrategy): number {
  if (strategy.name === "blockquote") {
    const match = lineText.match(/^(\s*>\s*)/);
    return match ? match[1].length : 0;
  }
  if (strategy.name === "list") {
    const match = lineText.match(/^(\s*[+\-*]|\s*\d+\.|\s*\d+\))\s/);
    return match ? match[1].length : 0;
  }
  return 0;
}