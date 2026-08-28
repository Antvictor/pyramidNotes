import { Extension } from "@tiptap/core";
import { defaultMarkdownSerializer } from "prosemirror-markdown";

/**
 * Preserve empty paragraphs through the markdown round-trip.
 *
 * **Serializer side** — patched at import time: the prosemirror-markdown
 * default paragraph serializer is replaced with one that emits `&nbsp;` for
 * empty paragraphs, so they survive the flushClose-overwrite bug that
 * collapses consecutive blank lines.
 *
 * **Parser side** — an `updateDOM` hook (called by tiptap-markdown's parser
 * for every extension that provides one) strips the `&nbsp;` marker back out
 * of the parsed HTML so the round-trip produces genuinely empty paragraph
 * nodes again.
 *
 * The extension is intentionally NOT named "paragraph" to avoid merging
 * with the built-in paragraph node extension (which would let tiptap-markdown's
 * default serializer overwrite the patch below).
 */

// ── Serializer patch ────────────────────────────────────────────────────────
const originalParagraph = defaultMarkdownSerializer.nodes.paragraph!;

defaultMarkdownSerializer.nodes.paragraph = function (state, node, parent, index) {
  if (node.content.size === 0) {
    if (!(state as any).atBlank()) {
      state.write("\n");
    }
    state.write(" "); // NBSP — survives markdown-it entity conversion
    state.closeBlock(node);
    return;
  }
  originalParagraph(state, node, parent, index);
};

// ── Parser hook ─────────────────────────────────────────────────────────────
export const EmptyParagraphPreserver = Extension.create({
  name: "emptyParagraphPreserver",

  addStorage() {
    return {
      markdown: {
        parse: {
          updateDOM(element: HTMLElement) {
            element.querySelectorAll("p").forEach((p) => {
              if (
                p.childNodes.length === 1 &&
                p.firstChild!.nodeType === 3 /* TEXT_NODE */ &&
                p.textContent === " "
              ) {
                p.innerHTML = "";
              }
            });
          },
        },
      },
    };
  },
});
