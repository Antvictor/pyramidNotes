// core/createEditor.ts
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { history, historyKeymap, defaultKeymap } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";

import { livePreviewPlugin } from "./plugins/livePreview.js";
import { autoList } from "./plugins/autoList.js";
import { cleanPaste } from "./plugins/paste.js";
import { createKeymap, type KeyBindingConfig } from "./keymap.js";

export function createEditor(
    el: HTMLElement,
    content: string,
    onChange: (v: string) => void,
    keyBindings: KeyBindingConfig[]
) {
    const keymapCompartment = new Compartment();
    const lightTheme = EditorView.theme({
        "&": {
            height: "100% !important",
            width: "100% !important",
            backgroundColor: "var(--background) !important",
            color: "var(--foreground) !important",
        },

        ".cm-content": {
            caretColor: "var(--foreground) !important",
            backgroundColor: "var(--background) !important",
        },

        ".cm-editor": {
            backgroundColor: "var(--background) !important",
        },

        // 关键：选区颜色
        ".cm-selectionBackground": {
            backgroundColor: "rgba(0, 120, 255, 0.25) !important",
        },

        // 可选：当前行
        ".cm-activeLine": {
            backgroundColor: "rgba(0, 0, 0, 0.05) !important",
        },

        // 可选：匹配高亮
        ".cm-selectionMatch": {
            backgroundColor: "rgba(255, 230, 0, 0.3) !important",
        },
    },
        { dark: false }
    );

    const state = EditorState.create({
        doc: content,
        extensions: [
            markdown(),
            history(),
            // oneDark,

            EditorView.lineWrapping,

            EditorView.updateListener.of((v) => {
                if (v.docChanged) {
                    onChange(v.state.doc.toString());
                }
            }),

            livePreviewPlugin(),
            autoList,
            cleanPaste,
            lightTheme,
            keymapCompartment.of(createKeymap(keyBindings)),

            keymap.of([...defaultKeymap, ...historyKeymap]),
        ],
    });

    const view = new EditorView({
        state,
        parent: el,
    });

    return {
        view,
        updateKeymap(newBindings: KeyBindingConfig[]) {
            view.dispatch({
                effects: keymapCompartment.reconfigure(createKeymap(newBindings)),
            });
        },
    };
}