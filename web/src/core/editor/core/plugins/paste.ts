// core/plugins/paste.ts
import { EditorView } from "@codemirror/view";

export const cleanPaste = EditorView.domEventHandlers({
  paste(event, view) {
    const text = event.clipboardData?.getData("text/plain");
    if (text) {
      event.preventDefault();
      view.dispatch({
        changes: {
          from: view.state.selection.main.from,
          to: view.state.selection.main.to,
          insert: text,
        },
      });
    }
  },
});