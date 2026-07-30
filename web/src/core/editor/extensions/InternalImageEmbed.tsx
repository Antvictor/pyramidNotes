import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { MarkdownSerializerState } from "prosemirror-markdown";
import { useState, useEffect } from "react";

type InternalImagePMNode = ProseMirrorNode & {
  attrs: {
    src?: string;
    alt?: string;
  };
};

function decodeName(name: string | null) {
  if (!name) return "";
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

function InternalImageNodeView({ node }: { node: InternalImagePMNode }) {
  const src = node.attrs.src || "";
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const isNetworkUrl = /^https?:\/\//.test(src);

  useEffect(() => {
    if (isNetworkUrl || !src) return;
    let cancelled = false;

    window.api.readAttachment(src).then((result) => {
      if (cancelled) return;
      if ("error" in result) {
        setLoadError(true);
      } else {
        setDataUrl(`data:${result.mimeType};base64,${result.base64}`);
      }
    }).catch(() => {
      if (!cancelled) setLoadError(true);
    });

    return () => { cancelled = true; };
  }, [src, isNetworkUrl]);

  if (isNetworkUrl) {
    return (
      <NodeViewWrapper className="internal-image-embed" contentEditable={false}>
        <img src={src} alt={node.attrs.alt || src} className="internal-image-embed-img" />
      </NodeViewWrapper>
    );
  }

  if (loadError) {
    return (
      <NodeViewWrapper className="internal-image-embed internal-image-embed-error" contentEditable={false}>
        <span>Broken image: {src}</span>
      </NodeViewWrapper>
    );
  }

  if (!dataUrl) {
    return (
      <NodeViewWrapper className="internal-image-embed internal-image-embed-loading" contentEditable={false}>
        <span>Loading image...</span>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="internal-image-embed" contentEditable={false}>
      <img src={dataUrl} alt={node.attrs.alt || src} className="internal-image-embed-img" />
    </NodeViewWrapper>
  );
}

export const InternalImageEmbed = Node.create({
  name: "internalImageEmbed",
  group: "block",
  atom: true,
  selectable: true,

  addOptions() {
    return {
      noteName: "",
    };
  },

  addAttributes() {
    return {
      src: {
        default: "",
        parseHTML: (element) => decodeName(element.getAttribute("data-src")),
        renderHTML: (attributes) => ({ "data-src": attributes.src || "" }),
      },
      alt: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-alt") || "",
        renderHTML: (attributes) => ({ "data-alt": attributes.alt || "" }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "internal-image-embed" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["internal-image-embed", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(InternalImageNodeView);
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: MarkdownSerializerState, node: InternalImagePMNode) {
          const src = node.attrs.src || "";
          if (/^https?:\/\//.test(src)) {
            state.write(`![](${src})`);
          } else {
            state.write(`![[${src}]]`);
          }
          state.closeBlock(node);
        },
        parse: {
          setup(_markdownit: unknown) {
            // Registered by InternalNodeLink.tsx registerInternalNodeSyntax
          },
        },
      },
    };
  },
});
