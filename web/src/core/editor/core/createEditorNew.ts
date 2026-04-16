import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { history, defaultKeymap } from "@codemirror/commands";

import { blockPreviewPlugin } from "./plugins/blockPreview.js";
import { createKeymap, type KeyBindingConfig } from "./keymap.js";

export function createEditorNew(
  el: HTMLElement,
  content: string,
  onChange: (v: string) => void,
  keyBindings: KeyBindingConfig[]
) {
  // =========================
  // 1. keymap 可热更新
  // =========================
  const keymapCompartment = new Compartment();

  // =========================
  // 2. state
  // =========================
  const state = EditorState.create({
    doc: content,
    extensions: [
      markdown(),
      history(),

      EditorView.lineWrapping,

      // change listener
      EditorView.updateListener.of((v) => {
        if (v.docChanged) {
          onChange(v.state.doc.toString());
        }
      }),

      // ⭐ block preview
      blockPreviewPlugin(),

      // ⭐ keymap（动态）
      keymapCompartment.of(createKeymap(keyBindings)),
      keymap.of(defaultKeymap),
    ],
  });

  const view = new EditorView({
    state,
    parent: el,
  });

  // =========================
  // 3. 返回 API（支持更新 keymap）
  // =========================
  return {
    view,

    updateKeymap(newBindings: KeyBindingConfig[]) {
      view.dispatch({
        effects: keymapCompartment.reconfigure(
          createKeymap(newBindings)
        ),
      });
    },
  };
}