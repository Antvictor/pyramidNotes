// TipTapEditor.tsx
import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { Extension } from "@tiptap/core";
import { EditorProvider, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Code } from "@tiptap/extension-code";
import { NodeSelection, Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { Markdown } from "tiptap-markdown";
import type { KeyBinding } from "./extensions/commands";
import { InternalNodeEmbed, InternalNodeLink } from "./extensions/InternalNodeLink";

type NodeLookupItem = {
  id: string;
  name: string;
  content?: string;
};

interface Props {
  content: string;
  onChange: (v: string) => void;
  keyBindings: KeyBinding[];
  nodes?: NodeLookupItem[];
  onCreateChildFromSelection?: (nodeName: string, content: string) => Promise<string>;
  onOpenNode?: (nodeName: string) => void;
}

type SuggestionState = {
  open: boolean;
  query: string;
  embed: boolean;
  from: number;
  to: number;
  x: number;
  y: number;
};

type ExtractionDraft = {
  markdown: string;
  beforeMarkdown: string;
  afterMarkdown: string;
  from: number;
  to: number;
};

type ExtractionOpenOptions = {
  allowStoredSelection?: boolean;
  draft?: ExtractionDraft | null;
};

const completionPluginKey = new PluginKey("internalNodeCompletion");
const wikiTokenPluginKey = new PluginKey("internalNodeTokenNormalizer");

function isEditorFloatingUiTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(
    ".editor-selection-menu, .editor-extraction-dialog-backdrop, .internal-node-suggestions",
  ));
}

function sanitizeExtractionNodeName(rawName: string) {
  return rawName.trim().replace(/\//g, "-");
}

function joinMarkdownParts(parts: string[]) {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n");
}

function sameSuggestion(left: SuggestionState | null, right: SuggestionState | null) {
  if (left === right) return true;
  if (!left || !right) return false;
  return (
    left.open === right.open &&
    left.query === right.query &&
    left.embed === right.embed &&
    left.from === right.from &&
    left.to === right.to &&
    left.x === right.x &&
    left.y === right.y
  );
}

function getSuggestionFromView(view: {
  state: Editor["state"];
  coordsAtPos: (pos: number) => { left: number; bottom: number };
}): SuggestionState | null {
  const { selection, doc } = view.state;
  if (!selection.empty) return null;

  const { from } = selection;
  const lookBehind = doc.textBetween(Math.max(0, from - 80), from, "\n", "\n");
  const match = /(!?\[\[)([^\]\n]{0,80})$/.exec(lookBehind);
  if (!match) return null;

  const coords = view.coordsAtPos(from);
  return {
    open: true,
    query: match[2].toLowerCase(),
    embed: match[1] === "![[" ,
    from: from - match[0].length,
    to: from,
    x: coords.left,
    y: coords.bottom + 6,
  };
}

const InternalNodeCompletion = Extension.create<{
  onChange: (suggestion: SuggestionState | null) => void;
}>({
  name: "internalNodeCompletion",

  addOptions() {
    return {
      onChange: () => {},
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: completionPluginKey,
        view: (view) => {
          const publish = () => this.options.onChange(getSuggestionFromView(view));
          publish();
          return {
            update: publish,
            destroy: () => this.options.onChange(null),
          };
        },
      }),
    ];
  },
});

const InternalNodeTokenNormalizer = Extension.create({
  name: "internalNodeTokenNormalizer",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: wikiTokenPluginKey,
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((transaction) => transaction.docChanged)) return null;

          const replacements: Array<{
            from: number;
            to: number;
            name: string;
            embed: boolean;
          }> = [];
          const tokenPattern = /(!?)\[\[([^\]\n]+?)\]\]/g;

          newState.doc.descendants((node, pos, parent) => {
            if (!node.isText || !node.text || parent?.type.name === "codeBlock") return;

            tokenPattern.lastIndex = 0;
            let match: RegExpExecArray | null;
            while ((match = tokenPattern.exec(node.text)) !== null) {
              const name = match[2].trim();
              if (!name) continue;
              replacements.push({
                from: pos + match.index,
                to: pos + match.index + match[0].length,
                name,
                embed: match[1] === "!",
              });
            }
          });

          if (replacements.length === 0) return null;

          const tr = newState.tr;
          for (const replacement of replacements.reverse()) {
            const nodeType = replacement.embed
              ? newState.schema.nodes.internalNodeEmbed
              : newState.schema.nodes.internalNodeLink;
            if (!nodeType) continue;

            const internalNode = replacement.embed
              ? nodeType.create({ name: replacement.name })
              : nodeType.create({ name: replacement.name });
            tr.replaceRangeWith(replacement.from, replacement.to, internalNode);
          }

          return tr.docChanged ? tr : null;
        },
      }),
    ];
  },
});

function matchEditorShortcut(event: KeyboardEvent, shortcut: string) {
  if (!shortcut) return false;

  const parts = shortcut.split(/[-+]/).filter(Boolean);
  const key = parts[parts.length - 1]?.toLowerCase();
  const modifiers = parts.slice(0, -1).map((part) => part.toLowerCase());
  const needsMod = modifiers.includes("mod");
  const needsCtrl = modifiers.includes("ctrl");
  const needsShift = modifiers.includes("shift");
  const needsAlt = modifiers.includes("alt");
  const modPressed = event.ctrlKey || event.metaKey;

  const modifierMatch =
    (needsMod || needsCtrl ? modPressed : !modPressed) &&
    (needsShift === event.shiftKey) &&
    (needsAlt === event.altKey);

  const keyMatch =
    key === "space" ? event.key === " " :
    key === "escape" ? event.key === "Escape" :
    key === "enter" ? event.key === "Enter" :
    key === "delete" ? event.key === "Delete" :
    key === "backspace" ? event.key === "Backspace" :
    event.key.toLowerCase() === key;

  return modifierMatch && keyMatch;
}

function restoreInternalNodeLinkToken(view: EditorView, event: KeyboardEvent) {
  if (event.key !== "Backspace" && event.key !== "Delete") return false;

  const { state } = view;
  const { selection, schema } = state;
  const linkType = schema.nodes.internalNodeLink;
  if (!linkType) return false;

  const replaceLink = (from: number, to: number, node: { attrs: { name?: string } }) => {
    const fallbackText = `[[${node.attrs.name || ""}]`;
    const tr = state.tr.replaceWith(from, to, schema.text(fallbackText));
    tr.setSelection(TextSelection.create(tr.doc, from + fallbackText.length));
    view.dispatch(tr);
    event.preventDefault();
    event.stopPropagation();
    return true;
  };

  if (selection instanceof NodeSelection && selection.node.type === linkType) {
    return replaceLink(selection.from, selection.to, selection.node);
  }

  if (!selection.empty) {
    let restored = false;
    state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
      if (restored || node.type !== linkType) return false;
      const nodeEnd = pos + node.nodeSize;
      if (selection.from <= pos && selection.to >= nodeEnd) {
        restored = replaceLink(pos, nodeEnd, node);
        return false;
      }
      return undefined;
    });
    return restored;
  }

  const { $from } = selection;
  if (event.key === "Backspace") {
    const nodeBefore = $from.nodeBefore;
    if (nodeBefore?.type === linkType) {
      return replaceLink($from.pos - nodeBefore.nodeSize, $from.pos, nodeBefore);
    }
  }

  const nodeAfter = $from.nodeAfter;
  if (event.key === "Delete" && nodeAfter?.type === linkType) {
    return replaceLink($from.pos, $from.pos + nodeAfter.nodeSize, nodeAfter);
  }

  return false;
}

function insertCompletedInternalNode(view: EditorView, nodeName: string, suggestion: SuggestionState) {
  const { state } = view;
  const nodeType = suggestion.embed
    ? state.schema.nodes.internalNodeEmbed
    : state.schema.nodes.internalNodeLink;
  if (!nodeType) return false;

  const node = nodeType.create({ name: nodeName });
  const tr = state.tr.replaceRangeWith(suggestion.from, suggestion.to, node);
  view.dispatch(tr.scrollIntoView());
  return true;
}

export default function TipTapEditor({
  content,
  onChange,
  keyBindings,
  nodes = [],
  onCreateChildFromSelection,
  onOpenNode,
}: Props) {
  const editorRef = useRef<Editor | null>(null);
  const editorRootRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef(content);
  const selectionDraftRef = useRef<ExtractionDraft | null>(null);
  const suggestionRef = useRef<SuggestionState | null>(null);
  const suggestedNodesRef = useRef<NodeLookupItem[]>([]);
  const activeSuggestionIndexRef = useRef(0);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [suggestion, setSuggestion] = useState<SuggestionState | null>(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [extractionDraft, setExtractionDraft] = useState<ExtractionDraft | null>(null);
  const [extractionName, setExtractionName] = useState("");
  const [isSubmittingExtraction, setIsSubmittingExtraction] = useState(false);
  const [editorResetKey, setEditorResetKey] = useState(0);

  // Update contentRef when content prop changes
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const markdownExtension = useMemo(() => Markdown.configure({
    html: false,
    tightLists: true,
    tightListClass: "tight",
    bulletListMarker: "-",
    linkify: false,
    breaks: false,
    transformPastedText: true,
    transformCopiedText: false,
  }), []);

  const starterKit = useMemo(() => StarterKit.configure({ code: false }), []);
  const completionExtension = useMemo(() => InternalNodeCompletion.configure({
    onChange: (nextSuggestion) => {
      if (sameSuggestion(suggestionRef.current, nextSuggestion)) return;
      suggestionRef.current = nextSuggestion;
      setSuggestion(nextSuggestion);
      activeSuggestionIndexRef.current = 0;
      setActiveSuggestionIndex(0);
    },
  }), []);
  const openNode = useMemo(() => onOpenNode || (() => {}), [onOpenNode]);
  const internalNodeLink = useMemo(() => InternalNodeLink.configure({ nodes, onOpenNode: openNode }), [nodes, openNode]);
  const internalNodeEmbed = useMemo(() => InternalNodeEmbed.configure({ nodes, onOpenNode: openNode }), [nodes, openNode]);
  const extensions = useMemo(
    () => [starterKit, Code, internalNodeLink, internalNodeEmbed, completionExtension, InternalNodeTokenNormalizer, markdownExtension],
    [starterKit, internalNodeLink, internalNodeEmbed, completionExtension, markdownExtension],
  );

  const handleUpdate = useCallback(({ editor }: { editor: Editor }) => {
    const markdown = editor.storage.markdown.getMarkdown();
    contentRef.current = markdown;
    onChange(markdown);
  }, [onChange]);

  const buildExtractionDraft = useCallback((editor: Editor, from: number, to: number) => {
    try {
      const serializer = editor.storage.markdown?.serializer;
      if (!serializer) return null;
      const { doc } = editor.state;
      const selectedMarkdown = serializer.serialize(doc.slice(from, to).content).trim();
      if (!selectedMarkdown) return null;

      return {
        markdown: selectedMarkdown,
        beforeMarkdown: serializer.serialize(doc.slice(0, from).content).trim(),
        afterMarkdown: serializer.serialize(doc.slice(to, doc.content.size).content).trim(),
        from,
        to,
      };
    } catch {
      return null;
    }
  }, []);

  const readSelectionDraft = useCallback((editor: Editor) => {
    const { from, to } = editor.state.selection;
    return buildExtractionDraft(editor, from, to);
  }, [buildExtractionDraft]);

  const readDomSelectionDraft = useCallback((editor: Editor) => {
    try {
      if (editor.isDestroyed) return null;
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;

      const { view } = editor;
      if (!view.dom.contains(selection.anchorNode) || !view.dom.contains(selection.focusNode)) return null;

      const anchor = view.posAtDOM(selection.anchorNode, selection.anchorOffset);
      const focus = view.posAtDOM(selection.focusNode, selection.focusOffset);
      const from = Math.min(anchor, focus);
      const to = Math.max(anchor, focus);
      if (from === to) return null;

      return buildExtractionDraft(editor, from, to);
    } catch {
      return null;
    }
  }, [buildExtractionDraft]);

  const captureSelectionDraft = useCallback((editor: Editor) => {
    const draft = readDomSelectionDraft(editor) || readSelectionDraft(editor);
    if (!draft) return null;

    selectionDraftRef.current = draft;
    return draft;
  }, [readDomSelectionDraft, readSelectionDraft]);

  const getExtractionDraft = useCallback((allowStoredSelection = false) => {
    const editor = editorRef.current;
    if (!editor || !onCreateChildFromSelection) return null;

    const draft = readDomSelectionDraft(editor) || readSelectionDraft(editor) || (allowStoredSelection ? selectionDraftRef.current : null);
    if (draft) selectionDraftRef.current = draft;
    return draft;
  }, [onCreateChildFromSelection, readDomSelectionDraft, readSelectionDraft]);

  const openExtractionDialog = useCallback((options: ExtractionOpenOptions = {}) => {
    const draft = options.draft || getExtractionDraft(Boolean(options.allowStoredSelection));
    if (!draft) return false;

    selectionDraftRef.current = draft;
    setExtractionDraft(draft);
    setExtractionName("");
    setIsSubmittingExtraction(false);
    setContextMenu(null);
    return true;
  }, [getExtractionDraft]);

  const closeExtractionDialog = useCallback(() => {
    setExtractionDraft(null);
    setExtractionName("");
    setIsSubmittingExtraction(false);
  }, []);

  const updateActiveSuggestionIndex = useCallback((nextIndex: number | ((currentIndex: number) => number)) => {
    setActiveSuggestionIndex((currentIndex) => {
      const rawIndex = typeof nextIndex === "function" ? nextIndex(currentIndex) : nextIndex;
      if (rawIndex === currentIndex) return currentIndex;
      activeSuggestionIndexRef.current = rawIndex;
      return rawIndex;
    });
  }, []);

  const submitExtraction = useCallback(() => {
    const safeNodeName = sanitizeExtractionNodeName(extractionName);
    if (!onCreateChildFromSelection || !extractionDraft || !safeNodeName || isSubmittingExtraction) return;

    setIsSubmittingExtraction(true);
    const nextContent = joinMarkdownParts([
      extractionDraft.beforeMarkdown,
      `[[${safeNodeName}]]`,
      extractionDraft.afterMarkdown,
    ]);

    contentRef.current = nextContent;

    onChange(nextContent);
    closeExtractionDialog();
    editorRef.current = null;
    setSuggestion(null);
    suggestionRef.current = null;
    setEditorResetKey((key) => key + 1);

    void onCreateChildFromSelection(safeNodeName, extractionDraft.markdown)
      .then(() => {
        window.setTimeout(() => {
          setEditorResetKey((key) => key + 1);
        }, 0);
      })
      .catch((error) => {
        console.error("Failed to create extracted child node", error);
      });
  }, [closeExtractionDialog, extractionDraft, extractionName, isSubmittingExtraction, onChange, onCreateChildFromSelection]);

  const completeNode = useCallback((nodeName: string, explicitSuggestion?: SuggestionState | null) => {
    const editor = editorRef.current;
    const currentSuggestion = explicitSuggestion || suggestionRef.current;
    if (!editor || !currentSuggestion) return;
    if (!insertCompletedInternalNode(editor.view, nodeName, currentSuggestion)) return;
    suggestionRef.current = null;
    setSuggestion(null);
  }, []);

  const suggestedNodes = useMemo(() => {
    if (!suggestion?.open) return [];
    return nodes
      .filter((node) => node.name.toLowerCase().includes(suggestion.query))
      .slice(0, 8);
  }, [nodes, suggestion]);

  useEffect(() => {
    suggestionRef.current = suggestion;
  }, [suggestion]);

  useEffect(() => {
    suggestedNodesRef.current = suggestedNodes;
    updateActiveSuggestionIndex((index) => Math.min(index, Math.max(0, suggestedNodes.length - 1)));
  }, [suggestedNodes, updateActiveSuggestionIndex]);

  const handleEditorKeyDown = useCallback((view: EditorView, event: KeyboardEvent) => {
    const editor = editorRef.current;

    if (restoreInternalNodeLinkToken(view, event)) return true;

    const currentSuggestion = suggestionRef.current;
    const currentSuggestedNodes = suggestedNodesRef.current;
    const currentActiveIndex = activeSuggestionIndexRef.current;

    if (event.key === "Escape" && currentSuggestion?.open) {
      event.preventDefault();
      event.stopPropagation();
      suggestionRef.current = null;
      setSuggestion(null);
      return true;
    }

    if (currentSuggestion?.open && currentSuggestedNodes.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        updateActiveSuggestionIndex((index) => (index + 1) % currentSuggestedNodes.length);
        return true;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        updateActiveSuggestionIndex((index) => (index - 1 + currentSuggestedNodes.length) % currentSuggestedNodes.length);
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        const nodeName = currentSuggestedNodes[currentActiveIndex]?.name || currentSuggestedNodes[0].name;
        if (!insertCompletedInternalNode(view, nodeName, currentSuggestion)) return false;
        suggestionRef.current = null;
        setSuggestion(null);
        return true;
      }
    }

    for (const binding of keyBindings) {
      if (matchEditorShortcut(event, binding.key)) {
        event.preventDefault();
        if (!editor) return true;
        switch (binding.action) {
          case "bold":
            editor.chain().focus().toggleBold().run();
            return true;
          case "italic":
            editor.chain().focus().toggleItalic().run();
            return true;
          case "code":
            editor.chain().focus().toggleCode().run();
            return true;
          case "heading1":
            editor.chain().focus().toggleHeading({ level: 1 }).run();
            return true;
          case "heading2":
            editor.chain().focus().toggleHeading({ level: 2 }).run();
            return true;
          case "extractNode":
            openExtractionDialog({ draft: getExtractionDraft(true) });
            return true;
        }
      }
    }

    return false;
  }, [completeNode, getExtractionDraft, keyBindings, openExtractionDialog, updateActiveSuggestionIndex]);

  const handleEditorWrapperKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    const extractBinding = keyBindings.find((binding) => binding.action === "extractNode");
    if (!extractBinding || !matchEditorShortcut(event.nativeEvent, extractBinding.key)) return;

    const draft = getExtractionDraft(true);
    if (!draft) return;

    event.preventDefault();
    event.stopPropagation();
    openExtractionDialog({ draft });
  }, [getExtractionDraft, keyBindings, openExtractionDialog]);

  const handleEditorWrapperContextMenu = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    const draft = getExtractionDraft(true);
    if (!draft) return;

    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY });
  }, [getExtractionDraft]);

  useEffect(() => {
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (extractionDraft) return;

      const root = editorRootRef.current;
      const extractBinding = keyBindings.find((binding) => binding.action === "extractNode");
      if (!root || !extractBinding || !matchEditorShortcut(event, extractBinding.key)) return;

      const activeElement = document.activeElement;
      const browserSelection = window.getSelection();
      const focusInsideEditor = activeElement ? root.contains(activeElement) : false;
      const selectionInsideEditor = browserSelection?.anchorNode ? root.contains(browserSelection.anchorNode) : false;
      if (!focusInsideEditor && !selectionInsideEditor) return;

      const draft = getExtractionDraft(true);
      if (!draft) return;

      event.preventDefault();
      event.stopPropagation();
      openExtractionDialog({ draft });
    };

    window.addEventListener("keydown", handleWindowKeyDown, true);
    return () => window.removeEventListener("keydown", handleWindowKeyDown, true);
  }, [extractionDraft, getExtractionDraft, keyBindings, openExtractionDialog]);

  return (
    <div
      ref={editorRootRef}
      style={{ height: "100%", width: "100%", overflowY: "auto", overflowX: "hidden", position: "relative" }}
      onClick={() => setContextMenu(null)}
      onMouseDownCapture={(event) => {
        if (isEditorFloatingUiTarget(event.target)) return;
        if (event.button === 0) selectionDraftRef.current = null;
      }}
      onContextMenuCapture={handleEditorWrapperContextMenu}
      onKeyDownCapture={handleEditorWrapperKeyDown}
    >
      <EditorProvider
        key={editorResetKey}
        extensions={extensions}
        onUpdate={handleUpdate}
        onSelectionUpdate={({ editor }) => {
          captureSelectionDraft(editor);
        }}
        onCreate={({ editor }) => {
          editorRef.current = editor;
          // Set markdown content after editor is created using tiptap-markdown's setContent command
          if (contentRef.current) {
            editor.chain().focus().setContent(contentRef.current).run();
          }
        }}
        editorProps={{
          attributes: {
            class: "outline-none min-h-full p-4 prose prose-sm max-w-none dark:prose-invert",
          },
          handleDOMEvents: {
            contextmenu: (_view, event) => {
              const draft = getExtractionDraft(true);
              if (!draft) return false;
              event.preventDefault();
              event.stopPropagation();
              setContextMenu({ x: event.clientX, y: event.clientY });
              return true;
            },
          },
          handleKeyDown: (view, event) => handleEditorKeyDown(view, event),
        }}
      >
        <div className="min-h-full" />
      </EditorProvider>
      {contextMenu && (
        <button
          type="button"
          className="editor-selection-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseDown={(event) => {
            event.preventDefault();
            openExtractionDialog({ allowStoredSelection: true });
          }}
        >
          抽取为子节点
        </button>
      )}
      {suggestion?.open && suggestedNodes.length > 0 && (
        <div className="internal-node-suggestions" style={{ left: suggestion.x, top: suggestion.y }}>
          {suggestedNodes.map((node, index) => (
            <button
              type="button"
              key={node.id}
              className={suggestedNodes[activeSuggestionIndex]?.id === node.id ? "is-active" : undefined}
              onMouseEnter={() => updateActiveSuggestionIndex(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                completeNode(node.name, suggestion);
              }}
            >
              {node.name}
            </button>
          ))}
        </div>
      )}
      {extractionDraft && (
        <div
          className="editor-extraction-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeExtractionDialog();
          }}
        >
          <form
            className="editor-extraction-dialog"
            onSubmit={(event) => {
              event.preventDefault();
              void submitExtraction();
            }}
          >
            <label htmlFor="extract-node-name">节点名称</label>
            <input
              id="extract-node-name"
              autoFocus
              value={extractionName}
              onChange={(event) => setExtractionName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!isSubmittingExtraction) closeExtractionDialog();
                }
              }}
              disabled={isSubmittingExtraction}
            />
            <div className="editor-extraction-dialog-actions">
              <button type="button" onClick={closeExtractionDialog} disabled={isSubmittingExtraction}>取消</button>
              <button type="submit" disabled={!extractionName.trim() || isSubmittingExtraction}>
                {isSubmittingExtraction ? "创建中..." : "创建"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
