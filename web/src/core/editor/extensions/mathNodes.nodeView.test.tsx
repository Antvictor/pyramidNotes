import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MathBlock } from "./mathNodes";

// MathBlock 的交互都在 React NodeView 里,必须挂到真实 React 树(useEditor + EditorContent)
// 才会同步渲染;直接用 new Editor() 时 tiptap 走 queueMicrotask 分支,NodeView 不会挂载。
let currentEditor: Editor | null = null;

function Harness({ content }: { content: string }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ code: false, codeBlock: false }), MathBlock],
    content,
  });
  currentEditor = editor;
  return <EditorContent editor={editor} />;
}

function pressKey(editor: Editor, key: string) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  return editor.view.someProp("handleKeyDown", (f) => f(editor.view, event));
}

function source(editor: Editor) {
  return editor.view.dom.querySelector<HTMLTextAreaElement>("textarea.math-block-source-input");
}

// tiptap 的 ReactRenderer 走 queueMicrotask 挂载 NodeView 的 React 树,
// 因此 render() 之后要空 flush 一次,事务监听才会被注册,否则按键事件先于挂载丢失。
async function flushNodeViews() {
  await act(async () => {
    await Promise.resolve();
  });
}

afterEach(() => {
  cleanup();
  currentEditor = null;
});

// 空段落起始位置 = 块内第一个文本位置(不是块边界)
const NON_EMPTY = '<math-block data-latex="x%5E2"></math-block><p>hello</p>';
const PARAGRAPH_START = 2;

describe("MathBlock NodeView interaction", () => {
  // 问题 1:块外段落行首删除键应进入块内编辑,而不是直接删掉 atom 节点
  it("enters edit mode on Backspace at the start of the paragraph below", async () => {
    render(<Harness content={NON_EMPTY} />);
    const editor = currentEditor!;
    editor.commands.setTextSelection(PARAGRAPH_START);

    await act(async () => {
      expect(pressKey(editor, "Backspace")).toBe(true);
    });

    expect(editor.state.doc.textContent).toContain("hello");
    expect(source(editor)?.value).toBe("x^2");
  });

  // 回归:边界删除进入编辑后,光标必须落在源码末尾(对齐原生代码块 Backspace 进块的光标位置),
  // 而不是新挂载 textarea 的默认偏移 0(用户报告:光标出现在首行行首)。
  it("places the caret at the end of the source on Backspace from below", async () => {
    render(<Harness content={NON_EMPTY} />);
    const editor = currentEditor!;
    await flushNodeViews();
    editor.commands.setTextSelection(PARAGRAPH_START);

    await act(async () => {
      pressKey(editor, "Backspace");
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });

    const input = source(editor)!;
    expect(input.value).toBe("x^2");
    expect(input.selectionStart).toBe(input.value.length);
  });

  // 对称用例:上方段落行尾 Delete 进块 → 光标落在源码开头(对齐原生代码块)
  it("places the caret at the start of the source on Delete from above", async () => {
    render(<Harness content='<p>hello</p><math-block data-latex="x%5E2"></math-block>' />);
    const editor = currentEditor!;
    await flushNodeViews();
    const paragraph = editor.state.doc.firstChild!;
    editor.commands.setTextSelection(paragraph.nodeSize - 1);

    await act(async () => {
      pressKey(editor, "Delete");
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });

    const input = source(editor)!;
    expect(input.value).toBe("x^2");
    expect(input.selectionStart).toBe(0);
  });

  // 问题 4:双击进入编辑 → 删空内容 → 再按删除键应删掉整块
  it("removes the block when the empty edit area gets a delete key", async () => {
    render(<Harness content={NON_EMPTY} />);
    const editor = currentEditor!;
    editor.commands.setTextSelection(PARAGRAPH_START);
    await act(async () => {
      pressKey(editor, "Backspace");
    });
    const input = source(editor)!;

    await act(async () => {
      fireEvent.change(input, { target: { value: "" } });
    });
    await act(async () => {
      fireEvent.keyDown(input, { key: "Backspace" });
    });

    expect(editor.state.doc.firstChild?.type.name).toBe("paragraph");
    expect(editor.state.doc.textContent).toContain("hello");
    expect(source(editor)).toBeNull();
  });

  // 问题 3:连续回车应像原生代码块一样退出编辑,光标落到块之后
  it("exits on triple Enter and leaves the caret after the block", async () => {
    render(<Harness content={NON_EMPTY} />);
    const editor = currentEditor!;
    editor.commands.setTextSelection(PARAGRAPH_START);
    await act(async () => {
      pressKey(editor, "Backspace");
    });
    const input = source(editor)!;
    const blockSize = editor.state.doc.firstChild!.nodeSize;

    await act(async () => {
      fireEvent.change(input, { target: { value: "E=mc^2\n\n" } });
      input.selectionStart = input.value.length;
      input.selectionEnd = input.value.length;
      fireEvent.keyDown(input, { key: "Enter" });
    });

    expect(source(editor)).toBeNull();
    expect(editor.state.doc.firstChild?.attrs.latex).toBe("E=mc^2");
    expect(editor.state.selection.from).toBeGreaterThan(blockSize);
  });

  // 空块无内容可编辑,边界删除直接删掉整块
  it("deletes an empty formula on boundary Backspace", async () => {
    render(<Harness content='<math-block data-latex=""></math-block><p>hello</p>' />);
    const editor = currentEditor!;
    editor.commands.setTextSelection(PARAGRAPH_START);

    await act(async () => {
      expect(pressKey(editor, "Backspace")).toBe(true);
    });

    expect(editor.state.doc.firstChild?.type.name).toBe("paragraph");
    expect(editor.state.doc.textContent).toContain("hello");
  });

  // 回归:删空源码再按删除键删掉整块后,持有焦点的 textarea 随节点卸载,
  // activeElement 掉到 body → PM 选区虽对但页面上看不见光标。
  it("keeps DOM focus in the editor after the emptied block is removed", async () => {
    render(<Harness content={NON_EMPTY} />);
    const editor = currentEditor!;
    editor.commands.setTextSelection(PARAGRAPH_START);
    await act(async () => {
      pressKey(editor, "Backspace");
    });
    const input = source(editor)!;

    await act(async () => {
      fireEvent.change(input, { target: { value: "" } });
    });
    await act(async () => {
      fireEvent.keyDown(input, { key: "Backspace" });
    });

    expect(editor.state.doc.firstChild?.type.name).toBe("paragraph");
    expect(editor.view.hasFocus()).toBe(true);
  });

  // 回归:三连回车退出时卸载 textarea,必须把 DOM 焦点还给编辑器,否则光标丢失。
  it("keeps DOM focus in the editor after triple-Enter exit", async () => {
    render(<Harness content={NON_EMPTY} />);
    const editor = currentEditor!;
    editor.commands.setTextSelection(PARAGRAPH_START);
    await act(async () => {
      pressKey(editor, "Backspace");
    });
    const input = source(editor)!;

    await act(async () => {
      fireEvent.change(input, { target: { value: "E=mc^2\n\n" } });
      input.selectionStart = input.value.length;
      input.selectionEnd = input.value.length;
      fireEvent.keyDown(input, { key: "Enter" });
    });

    expect(source(editor)).toBeNull();
    expect(editor.view.hasFocus()).toBe(true);
  });
});
