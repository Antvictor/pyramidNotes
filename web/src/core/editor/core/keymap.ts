// core/keymap.ts
import { keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";

export interface KeyBindingConfig {
  key: string;
  action: "bold" | "italic" | "heading1" | "heading2" | "custom";
  customHandler?: (ctx: {
    state: EditorState;
    dispatch: (tr: any) => void;
  }) => boolean;
}

export function createKeymap(bindings: KeyBindingConfig[]) {
  return keymap.of(
    bindings.map((b) => ({
      key: b.key,
      run: ({ state, dispatch }: any) => {
        const { from, to } = state.selection.main;
        const text = state.sliceDoc(from, to);

        switch (b.action) {
          case "bold":
            dispatch({ changes: { from, to, insert: `**${text}**` } });
            return true;

          case "italic":
            dispatch({ changes: { from, to, insert: `*${text}*` } });
            return true;

          case "heading1":
            dispatch({ changes: { from, insert: "# " } });
            return true;

          case "heading2":
            dispatch({ changes: { from, insert: "## " } });
            return true;

          case "custom":
            return b.customHandler
              ? b.customHandler({ state, dispatch })
              : false;

          default:
            return false;
        }
      },
    }))
  );
}