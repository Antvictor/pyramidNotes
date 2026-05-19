// core/createEditor.ts
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { history, historyKeymap, defaultKeymap } from "@codemirror/commands";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";

import { markdownDecorationPlugin } from "./plugins/markdownDecoration.js";
import { cursorSyntaxIndicator } from "./plugins/cursorSyntax.js";
import { autoContinue } from "./plugins/autoContinue.js";
import { initListStrategy } from "./plugins/autoList.js";
import { initBlockquoteStrategy } from "./plugins/autoBlockquote.js";
import { cleanPaste } from "./plugins/paste.js";
import { createKeymap, type KeyBindingConfig } from "./keymap.js";

const markdownHighlightStyle = HighlightStyle.define([
    { tag: tags.heading1, fontSize: "1.5em", fontWeight: "bold" },
    { tag: tags.heading2, fontSize: "1.3em", fontWeight: "bold" },
    { tag: tags.heading3, fontSize: "1.1em", fontWeight: "bold" },
    { tag: tags.heading4, fontSize: "1em", fontWeight: "bold" },
    { tag: tags.heading5, fontSize: "0.9em", fontWeight: "bold" },
    { tag: tags.heading6, fontSize: "0.85em", fontWeight: "bold" },
    { tag: tags.strong, fontWeight: "bold" },
    { tag: tags.emphasis, fontStyle: "italic" },
    { tag: tags.link, color: "var(--color-link)" },
    { tag: tags.url, color: "var(--color-link)" },
    { tag: tags.monospace, fontFamily: "monospace", backgroundColor: "var(--color-code-bg)" },
    { tag: tags.quote, color: "var(--color-text-secondary)", fontStyle: "italic" },
    { tag: tags.list, color: "var(--color-text-secondary)" },
]);

export function createEditor(
    el: HTMLElement,
    content: string,
    onChange: (v: string) => void,
    keyBindings: KeyBindingConfig[],
    onSyntaxChange?: (syntax: string) => void
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

        ".cm-selectionBackground": {
            backgroundColor: "rgba(0, 120, 255, 0.25) !important",
        },

        ".cm-activeLine": {
            backgroundColor: "rgba(0, 0, 0, 0.05) !important",
        },

        ".cm-selectionMatch": {
            backgroundColor: "rgba(255, 230, 0, 0.3) !important",
        },
    },
        { dark: false }
    );

    const state = EditorState.create({
        doc: content,
        extensions: [
            history(),
            syntaxHighlighting(markdownHighlightStyle),
            EditorView.lineWrapping,

            EditorView.updateListener.of((v) => {
                if (v.docChanged) {
                    onChange(v.state.doc.toString());
                }
            }),

            markdownDecorationPlugin(),
            onSyntaxChange ? cursorSyntaxIndicator(onSyntaxChange) : [],
            // Initialize auto-continue strategies
            (() => {
                initListStrategy();
                initBlockquoteStrategy();
                return [];
            })(),
            autoContinue,
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