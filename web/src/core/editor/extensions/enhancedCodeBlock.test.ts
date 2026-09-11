import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

import { EnhancedCodeBlock, resolveRenderedCodeLanguage } from "./enhancedCodeBlock";

describe("resolveRenderedCodeLanguage", () => {
  it("routes mermaid and math to rendered views", () => {
    expect(resolveRenderedCodeLanguage("mermaid")).toBe("mermaid");
    expect(resolveRenderedCodeLanguage("math")).toBe("math");
  });

  it("leaves every other language on the default code-block path", () => {
    expect(resolveRenderedCodeLanguage("typescript")).toBeNull();
    expect(resolveRenderedCodeLanguage("")).toBeNull();
    expect(resolveRenderedCodeLanguage(undefined)).toBeNull();
  });
});

describe("EnhancedCodeBlock extension", () => {
  // 回归:.extend 后默认的 addProseMirrorPlugins 会把 parent 链结果与自身
  // LowlightPlugin 叠加,插件重复注册会导致编辑器挂载即崩溃
  // (prosemirror-view DecorationGroup 出现 undefined 成员)。
  it("registers exactly one lowlight plugin", () => {
    const editor = new Editor({
      extensions: [StarterKit.configure({ code: false, codeBlock: false }), EnhancedCodeBlock],
      content: "hello\n",
    });
    const lowlightPlugins = (editor.state.plugins as Array<{ key?: string }>).filter(
      (plugin) => typeof plugin?.key === "string" && plugin.key.startsWith("lowlight"),
    );
    expect(lowlightPlugins).toHaveLength(1);
    editor.destroy();
  });

  it("mounts a document with highlighted code and math content", () => {
    const editor = new Editor({
      extensions: [
        StarterKit.configure({ code: false, codeBlock: false }),
        EnhancedCodeBlock,
      ],
      content: "```js\nconst a = 1;\n```\n\nhello $x$ world\n",
    });
    expect(editor.getText()).toContain("const a = 1;");
    editor.destroy();
  });
});
