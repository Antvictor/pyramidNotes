// TipTapEditor.tsx
import { useEffect, useCallback, useRef } from "react";
import { EditorProvider, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import type { KeyBinding } from "./extensions/commands";

interface Props {
  content: string;
  onChange: (v: string) => void;
  keyBindings: KeyBinding[];
}

export default function TipTapEditor({ content, onChange, keyBindings }: Props) {
  const editorRef = useRef<Editor | null>(null);
  const contentRef = useRef(content);

  // Update contentRef when content prop changes
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const handleUpdate = useCallback(({ editor }: { editor: Editor }) => {
    const markdown = editor.storage.markdown.getMarkdown();
    onChange(markdown);
  }, [onChange]);

  // Apply keybindings to editor when it becomes available
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isMod = event.ctrlKey || event.metaKey;

      for (const binding of keyBindings) {
        const modMatch = binding.key.toLowerCase().startsWith("mod-");
        const keyMatch = binding.key.toLowerCase().replace("mod-", "") === event.key.toLowerCase();

        if (modMatch && isMod && keyMatch) {
          event.preventDefault();
          switch (binding.action) {
            case "bold":
              editor.chain().focus().toggleBold().run();
              return;
            case "italic":
              editor.chain().focus().toggleItalic().run();
              return;
            case "heading1":
              editor.chain().focus().toggleHeading({ level: 1 }).run();
              return;
            case "heading2":
              editor.chain().focus().toggleHeading({ level: 2 }).run();
              return;
          }
        }
      }
    };

    const dom = editor.view.dom;
    dom.addEventListener("keydown", handleKeyDown);
    return () => dom.removeEventListener("keydown", handleKeyDown);
  }, [keyBindings]);

  const markdownExtension = Markdown.configure({
    html: false,
    tightLists: true,
    tightListClass: "tight",
    bulletListMarker: "-",
    orderedListMarker: ".",
    emDelimiter: "*",
    strongDelimiter: "**",
    codeDelimiter: "`",
    linkify: false,
    breaks: false,
    transformPastedText: true,
    transformCopiedText: false,
  });

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <EditorProvider
        extensions={[StarterKit, markdownExtension]}
        onUpdate={handleUpdate}
        onCreate={({ editor }) => {
          editorRef.current = editor;
          // Set markdown content after editor is created using tiptap-markdown's setContent command
          if (contentRef.current) {
            editor.chain().focus().setContent(contentRef.current).run();
          }
        }}
        editorProps={{
          attributes: {
            class: "outline-none min-h-full p-4 prose prose-sm max-w-none",
          },
        }}
      >
        <div className="min-h-full" />
      </EditorProvider>
    </div>
  );
}