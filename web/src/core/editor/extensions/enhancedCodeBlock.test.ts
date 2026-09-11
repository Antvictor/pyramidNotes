import { describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";

import { EnhancedCodeBlock, resolveRenderedCodeLanguage } from "./enhancedCodeBlock";

vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: '<svg id="mock-mermaid"></svg>' }),
  },
}));

function typeText(editor: Editor, text: string) {
  for (const char of text) {
    const { view } = editor;
    const { from, to } = view.state.selection;
    const handled = view.someProp("handleTextInput", (f) => f(view, from, to, char));
    if (!handled) view.dispatch(view.state.tr.insertText(char, from, to));
  }
}

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

  // 回归:渲染态点击块无法定位,空块只能从块外删除。
  // 预期:单击渲染层 → NodeSelection → 原生 Backspace 可删除整个块。
  it("selects the rendered block on click so it can be deleted natively", () => {
    const editor = new Editor({
      extensions: [
        StarterKit.configure({ code: false, codeBlock: false }),
        EnhancedCodeBlock,
      ],
      content: '<pre><code class="language-math">x^2</code></pre>',
    });
    const renderLayer = editor.view.dom.querySelector(".rendered-code-view") as HTMLElement;
    expect(renderLayer).not.toBeNull();
    renderLayer.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
    );
    const { selection } = editor.state;
    expect(selection instanceof NodeSelection).toBe(true);
    const node = editor.state.doc.nodeAt(selection.from);
    expect(node?.type.name).toBe("codeBlock");
    editor.view.dispatch(editor.state.tr.deleteSelection());
    expect(editor.state.doc.firstChild?.type.name).not.toBe("codeBlock");
    editor.destroy();
  });

  // 回归:块选中后按 Enter 应进入源码编辑(与双击等价)
  it("enters edit mode with Enter while the rendered block is selected", () => {
    const editor = new Editor({
      extensions: [
        StarterKit.configure({ code: false, codeBlock: false }),
        EnhancedCodeBlock,
      ],
      content: '<pre><code class="language-math">x^2</code></pre>',
    });
    const blockDom = editor.view.dom.querySelector(".rendered-code-block") as HTMLElement;
    const renderLayer = editor.view.dom.querySelector(".rendered-code-view") as HTMLElement;
    renderLayer.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
    );
    expect(editor.state.selection instanceof NodeSelection).toBe(true);
    blockDom.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
    );
    const pre = blockDom.querySelector("pre") as HTMLElement;
    expect(pre.style.display).toBe("");
    expect(renderLayer.style.display).toBe("none");
    editor.destroy();
  });
});

describe("EnhancedCodeBlock creation and render flow", () => {
  it("creates a mermaid code block on Enter and renders after leaving edit mode", async () => {
    vi.useFakeTimers();
    const editor = new Editor({
      extensions: [
        StarterKit.configure({ code: false, codeBlock: false }),
        EnhancedCodeBlock,
      ],
      content: "<p>```mermaid</p>",
    });
    // 模拟用户输入后的光标位置:段尾
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    const enterEvent = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    editor.view.someProp("handleKeyDown", (f) => f(editor.view, enterEvent));

    const block = editor.state.doc.firstChild;
    expect(block?.type.name).toBe("codeBlock");
    expect(block?.attrs.language).toBe("mermaid");

    typeText(editor, "graph TD; A-->B;");
    // 模拟点击编辑器外部 → 退出编辑态
    document.body.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
    );
    const renderLayer = editor.view.dom.querySelector(".rendered-code-view") as HTMLElement;
    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(0);
    expect(renderLayer.innerHTML).toContain("<svg");
    vi.useRealTimers();
    editor.destroy();
  });
});
