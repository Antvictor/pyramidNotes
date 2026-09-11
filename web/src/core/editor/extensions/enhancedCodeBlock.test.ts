import { describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/core";
import type { NodeViewRendererProps } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
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
    expect(blockDom.classList.contains("is-editing")).toBe(true);
    editor.destroy();
  });
});

describe("EnhancedCodeBlock boundary delete", () => {
  function pressKey(editor: Editor, key: string) {
    const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
    return editor.view.someProp("handleKeyDown", (f) => f(editor.view, event));
  }

  function blocksOf(editor: Editor) {
    const out: Array<{ type: string; text: string; language: string | null }> = [];
    editor.state.doc.forEach((child) => {
      out.push({
        type: child.type.name,
        text: child.textContent,
        language: (child.attrs.language as string | null) ?? null,
      });
    });
    return out;
  }

  // 回归:块外段落行首 Backspace 应进入块内编辑(显示源码),
  // 而不是把段落文字并进源码(原生 joinBackward 的行为)
  it("enters the block on Backspace at the start of the paragraph below", () => {
    const editor = new Editor({
      extensions: [
        StarterKit.configure({ code: false, codeBlock: false }),
        EnhancedCodeBlock,
      ],
      content: '<pre><code class="language-math">x^2</code></pre><p>hello</p>',
    });
    const block = editor.state.doc.firstChild;
    expect(block?.type.name).toBe("codeBlock");
    // 段内第一个文本位置(段首)
    editor.commands.setTextSelection(block!.nodeSize + 1);

    expect(pressKey(editor, "Backspace")).toBe(true);

    // 文本没有被并进源码
    expect(blocksOf(editor)).toEqual([
      { type: "codeBlock", text: "x^2", language: "math" },
      { type: "paragraph", text: "hello", language: null },
    ]);
    // 选区落在块内容末尾 → 进入编辑态显示源码
    expect(editor.state.selection.from).toBe(block!.nodeSize - 1);
    const blockDom = editor.view.dom.querySelector(".rendered-code-block") as HTMLElement;
    expect(blockDom.classList.contains("is-editing")).toBe(true);
    editor.destroy();
  });

  it("enters the block on Delete at the end of the paragraph above", () => {
    const editor = new Editor({
      extensions: [
        StarterKit.configure({ code: false, codeBlock: false }),
        EnhancedCodeBlock,
      ],
      content: '<p>hello</p><pre><code class="language-math">x^2</code></pre>',
    });
    const paragraph = editor.state.doc.firstChild;
    expect(paragraph?.type.name).toBe("paragraph");
    editor.commands.setTextSelection(paragraph!.nodeSize - 1);

    expect(pressKey(editor, "Delete")).toBe(true);

    // 段落后仍是原来的代码块(文字没被并进去),且已进入编辑态
    expect(blocksOf(editor).some((b) => b.type === "codeBlock" && b.text === "x^2")).toBe(true);
    const blockDom = editor.view.dom.querySelector(".rendered-code-block") as HTMLElement;
    expect(blockDom.classList.contains("is-editing")).toBe(true);
    editor.destroy();
  });

  // 空块无内容可编辑,边界删除直接删掉整块
  it("deletes an empty rendered block on boundary Backspace", () => {
    const editor = new Editor({
      extensions: [
        StarterKit.configure({ code: false, codeBlock: false }),
        EnhancedCodeBlock,
      ],
      content: '<pre><code class="language-math"></code></pre><p>hello</p>',
    });
    const block = editor.state.doc.firstChild;
    expect(block?.type.name).toBe("codeBlock");
    editor.commands.setTextSelection(block!.nodeSize + 1);

    expect(pressKey(editor, "Backspace")).toBe(true);

    expect(blocksOf(editor).some((b) => b.type === "codeBlock")).toBe(false);
    expect(editor.state.doc.textContent).toContain("hello");
    editor.destroy();
  });

  it("leaves mid-paragraph Backspace to ProseMirror", () => {
    const editor = new Editor({
      extensions: [
        StarterKit.configure({ code: false, codeBlock: false }),
        EnhancedCodeBlock,
      ],
      content: '<pre><code class="language-math">x^2</code></pre><p>hello</p>',
    });
    const block = editor.state.doc.firstChild;
    editor.commands.setTextSelection(block!.nodeSize + 3);

    pressKey(editor, "Backspace");

    // 仍在渲染态,未被拉进编辑
    const blockDom = editor.view.dom.querySelector(".rendered-code-block") as HTMLElement;
    expect(blockDom.classList.contains("is-editing")).toBe(false);
    expect(editor.state.doc.firstChild?.type.name).toBe("codeBlock");
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

describe("EnhancedCodeBlock edit-state sync and robustness", () => {
  function pressKey(editor: Editor, key: string) {
    const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
    return editor.view.someProp("handleKeyDown", (f) => f(editor.view, event));
  }

  function mkEditor(content: string) {
    return new Editor({
      extensions: [StarterKit.configure({ code: false, codeBlock: false }), EnhancedCodeBlock],
      content,
    });
  }

  function editState(editor: Editor) {
    const block = editor.view.dom.querySelector(".rendered-code-block") as HTMLElement;
    return { editing: block.classList.contains("is-editing") };
  }

  // 回归:三连回车退出时,选区从「块内末尾」映射到「新插入的空段落」,
  // 两处位置数值恰好相同 → tiptap 不发 selectionUpdate → 块停在编辑态不渲染,
  // 用户必须再敲一次键才看到结果。修复:同时监听 transaction。
  it("re-renders immediately on triple-Enter exit", () => {
    const editor = mkEditor("<p>```math</p>");
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    pressKey(editor, "Enter");
    expect(editor.state.doc.firstChild?.type.name).toBe("codeBlock");

    typeText(editor, "x^2");
    expect(editState(editor).editing).toBe(true);

    pressKey(editor, "Enter");
    pressKey(editor, "Enter");
    pressKey(editor, "Enter");

    expect(editor.state.doc.firstChild?.type.name).toBe("codeBlock");
    expect(editState(editor)).toEqual({ editing: false });
    editor.destroy();
  });

  // 回归:MermaidBlockView 构造函数漏传 getPos → syncEditState 在 pos == null 处
  // 静默返回,表现为「边界删除后光标进去了但仍是渲染内容,不显示源码」。
  it("enters edit mode on boundary Backspace for mermaid blocks", () => {
    const editor = mkEditor(
      '<pre><code class="language-mermaid">graph TD</code></pre><p>hello</p>',
    );
    const block = editor.state.doc.firstChild!;
    expect(block.type.name).toBe("codeBlock");
    editor.commands.setTextSelection(block.nodeSize + 1);

    expect(pressKey(editor, "Backspace")).toBe(true);

    expect(editState(editor)).toEqual({ editing: true });
    editor.destroy();
  });

  // 回归:只剩换行/空白的块,构造时按 trim 判空进编辑态,
  // 但删除键的空判断若用 `textContent.length === 0` 会判成「非空」,
  // 既不删块也不回落 → 用户按删除键「没反应」。
  it("deletes a whitespace-only block on the delete key", () => {
    const editor = mkEditor('<pre><code class="language-math"> </code></pre><p>hello</p>');
    const code = editor.view.dom.querySelector(".rendered-code-block pre") as HTMLElement;
    expect(code).not.toBeNull();

    code.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Backspace", bubbles: true, cancelable: true }),
    );

    expect(editor.state.doc.firstChild?.type.name).toBe("paragraph");
    expect(editor.state.doc.textContent).toContain("hello");
    editor.destroy();
  });

  // 回归(真实浏览器复现):contentDOM 必须是 <pre> 本身,不能再套一层 <code>。
  // 若 contentDOM 是 pre 内的 <code>,Chrome 在把内容删空时会把那个空的内联 <code>
  // 从 <pre> 里摘掉、换成 <br>(Blink 内部改 DOM,不走任何 JS API)。该 mutation 的
  // target 是 <pre>、落在 contentDOM 之外 → 被本视图的 ignoreMutation 吞掉 →
  // ProseMirror 收不到结构变更、desc.contentDOM 仍指向已摘除的 <code> →
  // 后续键入写进脱离文档的元素,状态停在「删空前的最后一个字符」,块永远删不掉,
  // 渲染态还会回放残留文本。
  it("uses the <pre> element itself as the contentDOM", () => {
    const editor = mkEditor('<pre><code class="language-math">x^2</code></pre><p>hello</p>');
    const block = editor.view.dom.querySelector(".rendered-code-block") as HTMLElement;
    const pre = block.querySelector("pre") as HTMLElement;
    expect(pre).not.toBeNull();
    expect(pre.querySelector("code")).toBeNull();
    expect(pre.textContent).toBe("x^2");
    editor.destroy();
  });

  // 回归:块回到渲染态、选区又不是 NodeSelection 时,stopEvent 让渲染层上的删除键
  // 到不了 ProseMirror(eventBelongsToView 为假),源码为空的块按删除键「没反应」。
  it("deletes an empty block from the render state when it is not a NodeSelection", () => {
    const editor = mkEditor('<pre><code class="language-math"></code></pre><p>hello</p>');
    editor.commands.setTextSelection(1); // 选区进入块内(空块构造即编辑态)
    editor.commands.setTextSelection(editor.state.doc.content.size - 1); // 离开 → 退出编辑回渲染态

    expect(editState(editor)).toEqual({ editing: false });
    expect(editor.state.selection instanceof NodeSelection).toBe(false);

    const renderLayer = editor.view.dom.querySelector(".rendered-code-view") as HTMLElement;
    renderLayer.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Backspace", bubbles: true, cancelable: true }),
    );

    expect(editor.state.doc.firstChild?.type.name).toBe("paragraph");
    expect(editor.state.doc.textContent).toContain("hello");
    editor.destroy();
  });
});

// prosemirror-view 的 CustomNodeViewDesc.update 在 dirty == NODE_DIRTY(内容由
// contentDOM 的 DOM 改动读回)时直接 return false,不调用本视图的 update() →
// NodeView 缓存的 this.node 会停在「上一次编辑前」的文本。这组测试把视图实例暴露出来,
// 直接把缓存改旧,锁死「删除判断与渲染都必须读实时文档」。
type ExposedView = { node: PMNode };

const Exposed = EnhancedCodeBlock.extend({
  addNodeView() {
    const parentFactory = (this.parent?.() ?? (() => null)) as (
      props: NodeViewRendererProps,
    ) => { dom?: HTMLElement } | null;
    return (props: NodeViewRendererProps) => {
      const view = parentFactory(props);
      if (view?.dom) {
        (view.dom as unknown as { __view?: ExposedView }).__view = view as unknown as ExposedView;
      }
      return view;
    };
  },
});

describe("EnhancedCodeBlock stale cache tolerance", () => {
  function mkExposed(content: string) {
    return new Editor({
      extensions: [StarterKit.configure({ code: false, codeBlock: false }), Exposed],
      content,
    });
  }

  function viewOf(editor: Editor) {
    const dom = editor.view.dom.querySelector(".rendered-code-block") as unknown as {
      __view?: ExposedView;
    };
    return dom!.__view!;
  }

  function codeBlock(editor: Editor, language: string, text: string) {
    return editor.schema.nodes.codeBlock.create({ language }, editor.schema.text(text));
  }

  function hasCodeBlock(editor: Editor) {
    let found = false;
    editor.state.doc.forEach((child) => {
      if (child.type.name === "codeBlock") found = true;
    });
    return found;
  }

  // 真实场景(用户报告):删空源码后按删除键块不消失——文档已空,但缓存停在删空前的
  // 文本(update 被 NODE_DIRTY 跳过),空判断读缓存 → 判成「非空」→ 既不删块也不回落。
  // 块放在段落之后:PM 的选区留在段落里,原生按键不会顺手删掉这个空块,删除只可能来自本视图。
  it("deletes the block on the delete key even when the cached node is stale", () => {
    const editor = mkExposed('<p>hello</p><pre><code class="language-mermaid"></code></pre>');
    // 实时文档里块是空的;缓存停在上一版 "g"
    viewOf(editor).node = codeBlock(editor, "mermaid", "g");
    editor.commands.setTextSelection(1);

    const code = editor.view.dom.querySelector(".rendered-code-block pre") as HTMLElement;
    code.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Backspace", bubbles: true, cancelable: true }),
    );

    expect(hasCodeBlock(editor)).toBe(false);
    expect(editor.state.doc.textContent).toContain("hello");
    editor.destroy();
  });

  // 必须走「边界删除进入编辑 → 选区离开退编辑并重渲染」这条真实路径,否则 scheduleRender 不会被调用。
  it("renders the live document content, not the stale cached node", () => {
    const editor = mkExposed('<pre><code class="language-math">x^2</code></pre><p>hello</p>');
    const block = editor.state.doc.firstChild!;
    // 段落行首 Backspace → 进入块内编辑态(显示源码)
    editor.commands.setTextSelection(block.nodeSize + 1);
    const backspace = new KeyboardEvent("keydown", { key: "Backspace", bubbles: true, cancelable: true });
    expect(editor.view.someProp("handleKeyDown", (f) => f(editor.view, backspace))).toBe(true);

    // 缓存换成一段非法 LaTeX;实时文档仍是 x^2
    viewOf(editor).node = codeBlock(editor, "math", "\\notarealcommand{");

    // 点击块外 → 退出编辑并重渲染。不能走事务(setTextSelection):PM 的 view 更新会先调用
    // update() 把缓存刷回实时文档,从而掩盖「scheduleRender 读了缓存」的 bug。
    document.body.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
    );
    const renderLayer = editor.view.dom.querySelector(".rendered-code-view") as HTMLElement;
    expect(renderLayer.classList.contains("has-error")).toBe(false);
    expect(renderLayer.innerHTML).toContain("katex");
    editor.destroy();
  });
});
