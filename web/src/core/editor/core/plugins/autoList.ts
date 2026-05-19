// autoList strategy for autoContinue
// Handles: unordered (- + *), ordered (1. 1))

import { registerStrategy } from "./autoContinue";
import type { AutoContinueStrategy } from "./autoContinue";
import type { EditorView } from "@codemirror/view";

let lastWasEmptyListItem = false;

const listStrategy: AutoContinueStrategy = {
  name: "list",

  match(lineText: string): boolean {
    return !!lineText.match(/^(\s*[+\-*]|\s*\d+\.|\s*\d+\))\s/);
  },

  isEmptyCancelable: true,

  getContinuation(lineText: string): string | null {
    const match = lineText.match(/^(\s*[+\-*]|\s*\d+\.|\s*\d+\))\s/);
    if (!match) return null;
    return getNextMarker(match[1]);
  },

  cancel(view: EditorView, from: number, to: number, lineText: string): boolean {
    lastWasEmptyListItem = false;
    view.dispatch({
      changes: { from, insert: "\n" },
    });
    return true;
  }
};

function getNextMarker(marker: string): string {
  const orderedMatch = marker.match(/^(\s*)(\d+)([.)])(\s*)$/);
  if (orderedMatch) {
    const indent = orderedMatch[1];
    const num = parseInt(orderedMatch[2], 10);
    const style = orderedMatch[3];
    const trailingSpace = orderedMatch[4];
    return `${indent}${num + 1}${style}${trailingSpace}`;
  }
  return marker;
}

export function initListStrategy() {
  registerStrategy(listStrategy);
}