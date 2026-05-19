// autoBlockquote strategy for autoContinue
// Handles: > quote continuation, empty > cancels

import { registerStrategy } from "./autoContinue";
import type { AutoContinueStrategy } from "./autoContinue";
import type { EditorView } from "@codemirror/view";

const blockquoteStrategy: AutoContinueStrategy = {
  name: "blockquote",

  match(lineText: string): boolean {
    // Match lines starting with > (with optional whitespace)
    return !!lineText.match(/^(\s*>\s*)/);
  },

  isEmptyCancelable: true,

  getContinuation(lineText: string): string | null {
    // If line has content after >, continue with >
    const match = lineText.match(/^(\s*>\s)(.*)/);
    if (match && match[2].length > 0) {
      return "> ";
    }
    return null;
  },

  cancel(view: EditorView, from: number, to: number, lineText: string): boolean {
    // Delete the entire blockquote marker line
    view.dispatch({
      changes: { from, to, insert: "" },
    });
    return true;
  }
};

export function initBlockquoteStrategy() {
  registerStrategy(blockquoteStrategy);
}