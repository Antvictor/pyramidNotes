import { Node, mergeAttributes } from "@tiptap/core";
import { EditorContent, ReactNodeViewRenderer, NodeViewWrapper, useEditor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { MarkdownSerializerState } from "prosemirror-markdown";
import type { MouseEvent } from "react";
import StarterKit from "@tiptap/starter-kit";
import { Code } from "@tiptap/extension-code";
import { Markdown } from "tiptap-markdown";

type NodeLookupItem = {
  id: string;
  name: string;
  content?: string;
};

type InternalNodeOptions = {
  nodes: NodeLookupItem[];
  onOpenNode: (name: string) => void;
  embedPath: string[];
};

function encodeName(name: string) {
  return encodeURIComponent(name);
}

function decodeName(name: string | null) {
  if (!name) return "";
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

type InlineState = {
  src: string;
  pos: number;
  push: (type: string, tag: string, nesting: number) => {
    attrs?: string[][];
    content?: string;
    attrGet?: (name: string) => string | null;
  };
};

type MarkdownToken = {
  attrGet: (name: string) => string | null;
};

type MarkdownItLike = {
  __internalNodeSyntaxRegistered?: boolean;
  inline: {
    ruler: {
      before: (
        beforeName: string,
        ruleName: string,
        rule: (state: InlineState, silent: boolean) => boolean,
      ) => void;
    };
  };
  renderer: {
    rules: Record<string, (tokens: MarkdownToken[], idx: number) => string>;
  };
};

type InternalNodePMNode = ProseMirrorNode & {
  attrs: {
    name?: string;
  };
};

function openNodeFromLink(event: MouseEvent, target: NodeLookupItem | undefined, name: string, onOpenNode: (name: string) => void) {
  if (!target) return;

  event.preventDefault();
  event.stopPropagation();
  onOpenNode(name);
}

const markdownPreviewExtension = Markdown.configure({
  html: false,
  tightLists: true,
  tightListClass: "tight",
  bulletListMarker: "-",
  linkify: false,
  breaks: false,
  transformPastedText: false,
  transformCopiedText: false,
});

function registerInternalNodeSyntax(markdownit: unknown) {
  const md = markdownit as MarkdownItLike;
  if (md.__internalNodeSyntaxRegistered) return;
  md.__internalNodeSyntaxRegistered = true;

  md.inline.ruler.before("image", "internal_node_link", (state: InlineState, silent: boolean) => {
    const src = state.src.slice(state.pos);
    const embed = src.startsWith("![[");
    const marker = embed ? "![[" : "[[";
    if (!src.startsWith(marker)) return false;

    const end = src.indexOf("]]", marker.length);
    if (end < 0) return false;
    if (silent) return true;

    const name = src.slice(marker.length, end).trim();
    if (!name) return false;

    const token = state.push(embed ? "internal_node_embed" : "internal_node_link", "", 0);
    token.attrs = [["data-name", encodeName(name)]];
    token.content = name;
    state.pos += end + 2;
    return true;
  });

  md.renderer.rules.internal_node_link = (tokens: MarkdownToken[], idx: number) => {
    const name = tokens[idx].attrGet("data-name") || "";
    return `<internal-node-link data-name="${name}">${decodeName(name)}</internal-node-link>`;
  };

  md.renderer.rules.internal_node_embed = (tokens: MarkdownToken[], idx: number) => {
    const name = tokens[idx].attrGet("data-name") || "";
    return `<internal-node-embed data-name="${name}"></internal-node-embed>`;
  };
}

function ReadOnlyMarkdownPreview({
  content,
  nodes,
  onOpenNode,
  embedPath,
}: {
  content: string;
  nodes: NodeLookupItem[];
  onOpenNode: (name: string) => void;
  embedPath: string[];
}) {
  const editor = useEditor({
    editable: false,
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ code: false }),
      Code,
      InternalNodeLink.configure({ nodes, onOpenNode, embedPath }),
      InternalNodeEmbed.configure({ nodes, onOpenNode, embedPath }),
      markdownPreviewExtension,
    ],
    content,
  }, [content, nodes, onOpenNode, embedPath.join("\u0000")]);

  return <EditorContent editor={editor} className="internal-node-embed-content prose prose-sm max-w-none dark:prose-invert" />;
}

export const InternalNodeLink = Node.create({
  name: "internalNodeLink",
  group: "inline",
  inline: true,
  atom: true,
  selectable: false,

  addOptions() {
    return {
      nodes: [] as NodeLookupItem[],
      onOpenNode: () => {},
      embedPath: [] as string[],
    };
  },

  addAttributes() {
    return {
      name: {
        default: "",
        parseHTML: (element) => decodeName(element.getAttribute("data-name")) || element.textContent?.trim(),
        renderHTML: (attributes) => ({ "data-name": encodeName(attributes.name || "") }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "internal-node-link" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["internal-node-link", mergeAttributes(HTMLAttributes), decodeName(HTMLAttributes["data-name"])];
  },

  addNodeView() {
    return ReactNodeViewRenderer(({ node, extension }) => {
      const name = node.attrs.name || "";
      const options = extension.options as InternalNodeOptions;
      const target = options.nodes.find((item) => item.name === name);
      return (
        <NodeViewWrapper
          as="span"
          className={target ? "internal-node-link" : "internal-node-link internal-node-link-missing"}
          contentEditable={false}
          onClick={(event) => openNodeFromLink(event, target, name, options.onOpenNode)}
        >
          {name}
        </NodeViewWrapper>
      );
    });
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownSerializerState, node: InternalNodePMNode) {
          state.write(`[[${node.attrs.name || ""}]]`);
        },
        parse: {
          setup(markdownit: unknown) {
            registerInternalNodeSyntax(markdownit);
          },
        },
      },
    };
  },
});

export const InternalNodeEmbed = Node.create({
  name: "internalNodeEmbed",
  group: "block",
  atom: true,
  selectable: true,

  addOptions() {
    return {
      nodes: [] as NodeLookupItem[],
      onOpenNode: () => {},
      embedPath: [] as string[],
    };
  },

  addAttributes() {
    return {
      name: {
        default: "",
        parseHTML: (element) => decodeName(element.getAttribute("data-name")),
        renderHTML: (attributes) => ({ "data-name": encodeName(attributes.name || "") }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "internal-node-embed" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["internal-node-embed", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(({ node, extension }) => {
      const name = node.attrs.name || "";
      const options = extension.options as InternalNodeOptions;
      const target = options.nodes.find((item: NodeLookupItem) => item.name === name);

      if (!target) {
        return (
          <NodeViewWrapper className="internal-node-embed internal-node-embed-missing" contentEditable={false}>
            <div className="internal-node-embed-title">{name}</div>
            <div className="internal-node-embed-placeholder">未找到该节点</div>
          </NodeViewWrapper>
        );
      }

      if (options.embedPath.includes(target.id)) {
        return (
          <NodeViewWrapper className="internal-node-embed internal-node-embed-cycle" contentEditable={false}>
            <div className="internal-node-embed-title">{name}</div>
            <div className="internal-node-embed-placeholder">检测到循环嵌入</div>
          </NodeViewWrapper>
        );
      }

      return (
        <NodeViewWrapper className="internal-node-embed" contentEditable={false}>
          <div className="internal-node-embed-title">{name}</div>
          <ReadOnlyMarkdownPreview
            content={target.content || ""}
            nodes={options.nodes}
            onOpenNode={options.onOpenNode}
            embedPath={[...options.embedPath, target.id]}
          />
        </NodeViewWrapper>
      );
    });
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownSerializerState, node: InternalNodePMNode) {
          state.write(`![[${node.attrs.name || ""}]]`);
          state.closeBlock(node);
        },
        parse: {
          setup(markdownit: unknown) {
            registerInternalNodeSyntax(markdownit);
          },
        },
      },
    };
  },
});
