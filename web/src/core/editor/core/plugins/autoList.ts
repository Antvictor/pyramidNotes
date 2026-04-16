// core/plugins/autoList.ts
import { EditorView } from "@codemirror/view";

export const autoList = EditorView.inputHandler.of(
  (view, from, to, text) => {
    if (text === "\n") {
      const line = view.state.doc.lineAt(from);
      const match = line.text.match(/^(\s*[-*+]|\s*\d+\.)\s/);

      if (match) {
        view.dispatch({
          changes: { from, insert: `\n${match[0]}` },
        });
        return true;
      }
    }
    return false;
  }
);