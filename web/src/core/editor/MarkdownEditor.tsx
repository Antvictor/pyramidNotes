// MarkdownEditor.tsx
import { useEffect, useRef } from "react";
import { createEditor } from "./core/createEditor.js";
import { EditorView } from "@codemirror/view";
import { type KeyBindingConfig } from "./core/keymap.js";
import "./css/markdown.css";
interface Props {
    content: string;
    onChange: (v: string) => void;
    keyBindings: KeyBindingConfig[];
}

export default function MarkdownEditor({
    content,
    onChange,
    keyBindings,
}: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const editorRef = useRef<any>(null);
    const viewRef = useRef<EditorView | null>(null);

    useEffect(() => {
        if (!ref.current) return;

        const editor = createEditor(
            ref.current,
            content, // ❗不要用 content
            onChange,
            keyBindings
        );

        editorRef.current = editor;

        return () => editor.view.destroy();
    }, []);

    useEffect(() => {
        editorRef.current?.updateKeymap(keyBindings);
    }, [keyBindings]);

    // useEffect(() => {
    //     const view = editorRef.current?.view; // ❗改这里
    //     if (!view) return;

    //     const current = view.state.doc.toString();

    //     if (current === content) return;

    //     view.dispatch({
    //         changes: {
    //             from: 0,
    //             to: current.length,
    //             insert: content || "",
    //         },
    //     });
    // }, [content]);

    return <div ref={ref} style={{ height: "100%", width: "100%" }} />;
}