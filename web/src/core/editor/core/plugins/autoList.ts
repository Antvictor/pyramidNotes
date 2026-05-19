// core/plugins/autoList.ts
import { EditorView } from "@codemirror/view";

// Track if the previous input was an empty list item continuation
let lastWasEmptyListItem = false;

export const autoList = EditorView.inputHandler.of(
  (view, from, to, text) => {
    if (text === "\n") {
      const line = view.state.doc.lineAt(from);

      // Match list markers: - + * for unordered, 1. 1) for ordered
      const match = line.text.match(/^(\s*[+\-*]|\s*\d+\.|\s*\d+\))\s/);

      if (match) {
        const listMarker = match[1];
        const hasContent = line.text.trim().length > listMarker.trim().length;

        // If previous was an empty list item and current line is also empty list continuation
        if (lastWasEmptyListItem && !hasContent) {
          // Cancel list - just insert a newline without list marker
          lastWasEmptyListItem = false;
          view.dispatch({
            changes: { from, insert: "\n" },
          });
          return true;
        }

        // Track if this is an empty list item
        lastWasEmptyListItem = !hasContent;

        // Continue the list with same marker type
        const nextMarker = getNextMarker(listMarker);
        view.dispatch({
          changes: { from, insert: `\n${nextMarker}` },
        });
        return true;
      }

      // Reset state if not on a list line
      lastWasEmptyListItem = false;
    }
    return false;
  }
);

// Get the next marker in sequence for ordered lists
function getNextMarker(marker: string): string {
  // Check if it's an ordered list (contains number)
  const orderedMatch = marker.match(/^(\s*)(\d+)([.)])(\s*)$/);
  if (orderedMatch) {
    const indent = orderedMatch[1];
    const num = parseInt(orderedMatch[2], 10);
    const style = orderedMatch[3];
    const trailingSpace = orderedMatch[4];
    return `${indent}${num + 1}${style}${trailingSpace}`;
  }

  // For unordered lists, keep the same marker
  return marker;
}