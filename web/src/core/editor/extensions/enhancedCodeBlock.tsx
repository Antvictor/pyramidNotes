import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import type { NodeView } from "@tiptap/pm/view";
import i18n from "i18next";
import { common, createLowlight } from "lowlight";

import { renderKatex } from "./mathNodes";

export function resolveRenderedCodeLanguage(language: unknown): "mermaid" | "math" | null {
  if (language === "mermaid") return "mermaid";
  if (language === "math") return "math";
  return null;
}

const lowlight = createLowlight(common);

// ---- mermaid 懒加载单例(独立 chunk,编辑器启动不加载) ----
type MermaidApi = Awaited<typeof import("mermaid")>["default"];
let mermaidPromise: Promise<MermaidApi> | null = null;
let initializedTheme: "dark" | "default" | null = null;

function currentTheme(): "dark" | "default" {
  return document.documentElement.classList.contains("dark") ? "dark" : "default";
}

export function loadMermaid(): Promise<MermaidApi> {
  const theme = currentTheme();
  if (!mermaidPromise) {
    initializedTheme = theme;
    mermaidPromise = import("mermaid").then((module) => {
      module.default.initialize({ startOnLoad: false, securityLevel: "strict", theme });
      return module.default;
    });
    mermaidPromise.catch(() => {
      mermaidPromise = null; // 失败可重试
    });
  }
  return mermaidPromise.then((mermaid) => {
    if (initializedTheme !== theme) {
      mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme });
      initializedTheme = theme;
    }
    return mermaid;
  });
}

let renderCounter = 0;

async function renderMermaidSvg(source: string): Promise<string> {
  const mermaid = await loadMermaid();
  const { svg } = await mermaid.render(`mermaid-view-${++renderCounter}`, source);
  return svg;
}

// ---- 渲染型代码块 NodeView 基类 ----
// 结构:div.rendered-code-block > [pre > code(contentDOM,编辑态显示)] + [div.rendered-code-view(渲染态显示)]
// contentDOM 始终是文档真实内容 → 原生编辑/撤销/IME 零自研逻辑
//
// 选中与删除(对齐原生代码块体验):
// - 单击渲染层 → NodeSelection 选中块,原生 Backspace/Delete 即可删除
// - 块选中时 Enter(或任意单字符键)进入源码编辑;Backspace/Delete/方向键交给 ProseMirror 原生处理
abstract class RenderedCodeBlockView implements NodeView {
  node: PMNode;
  editor: Editor;
  dom: HTMLElement;
  contentDOM: HTMLElement;
  protected getPos: (() => number | undefined) | undefined;
  protected renderLayer: HTMLElement;
  protected renderToken = 0;
  protected isEditing = false;
  protected onDestroy: (() => void) | null = null;

  private handleDocumentMouseDown = (event: MouseEvent) => {
    if (!this.isEditing) return;
    if (event.target instanceof Node && this.dom.contains(event.target)) return;
    this.exitEdit();
  };

  private handleRenderLayerMouseDown = (event: MouseEvent) => {
    if (this.isEditing) return;
    event.preventDefault();
    const { state, dispatch } = this.editor.view;
    const pos = typeof this.getPos === "function" ? this.getPos() : undefined;
    if (pos == null) return;
    dispatch(state.tr.setSelection(NodeSelection.create(state.doc, pos)));
    this.dom.focus();
  };

  private handleBlockKeyDown = (event: KeyboardEvent) => {
    if (this.isEditing) return;
    const { selection } = this.editor.state;
    if (!(selection instanceof NodeSelection)) return;
    const pos = typeof this.getPos === "function" ? this.getPos() : undefined;
    if (pos == null || selection.from !== pos) return;
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      this.enterEdit();
      return;
    }
    // 单字符输入:进入编辑态并吞掉该字符,避免 NodeSelection 被文本替换
    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      this.enterEdit();
    }
    // Backspace/Delete/方向键等冒泡至视图,由 ProseMirror 原生处理
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    this.exitEdit();
  };

  constructor(node: PMNode, editor: Editor, getPos?: () => number | undefined) {
    this.node = node;
    this.editor = editor;
    this.getPos = getPos;

    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.textContent = node.textContent;
    pre.appendChild(code);
    this.contentDOM = code;

    this.renderLayer = document.createElement("div");
    this.renderLayer.className = "rendered-code-view";
    this.renderLayer.title = i18n.t("editor.editSource");
    this.renderLayer.addEventListener("mousedown", this.handleRenderLayerMouseDown);
    this.renderLayer.addEventListener("dblclick", () => this.enterEdit());

    this.dom = document.createElement("div");
    this.dom.className = "rendered-code-block";
    this.dom.tabIndex = -1;
    this.dom.append(pre, this.renderLayer);
    this.dom.addEventListener("keydown", this.handleBlockKeyDown);

    // 空源码(输入 ```mermaid 后)直接进编辑态,用户可立即输入
    this.isEditing = node.textContent.trim() === "" && editor.isEditable;
    this.applyEditMode();

    document.addEventListener("mousedown", this.handleDocumentMouseDown, true);
    this.contentDOM.addEventListener("keydown", this.handleKeyDown);

    if (!this.isEditing) this.scheduleRender();
  }

  update(node: PMNode): boolean {
    if (node.type.name !== this.node.type.name) return false;
    const sourceChanged = node.textContent !== this.node.textContent;
    this.node = node;
    if (sourceChanged && !this.isEditing) this.scheduleRender();
    return true;
  }

  selectNode(): void {
    this.dom.classList.add("is-selected");
  }

  deselectNode(): void {
    this.dom.classList.remove("is-selected");
  }

  // 渲染层是自绘区域:单击选中/双击编辑都由本视图处理,
  // 不让 ProseMirror 再按坐标推算选区(jsdom 下还会因缺 elementFromPoint 抛错)
  stopEvent(event: Event): boolean {
    return !this.isEditing && this.renderLayer.contains(event.target as Node);
  }

  ignoreMutation(mutation: MutationRecord): boolean {
    // contentDOM 之外的变更(渲染层 innerHTML)由视图自行管理
    return !this.contentDOM.contains(mutation.target) && mutation.target !== this.contentDOM;
  }

  destroy(): void {
    this.renderToken += 1; // 使进行中的异步渲染失效
    document.removeEventListener("mousedown", this.handleDocumentMouseDown, true);
    this.contentDOM.removeEventListener("keydown", this.handleKeyDown);
    this.dom.removeEventListener("keydown", this.handleBlockKeyDown);
    this.onDestroy?.();
  }

  protected enterEdit() {
    if (this.isEditing || !this.editor.isEditable) return;
    this.isEditing = true;
    this.renderToken += 1;
    this.applyEditMode();
    this.contentDOM.focus();
  }

  protected exitEdit() {
    if (!this.isEditing) return;
    this.isEditing = false;
    this.applyEditMode();
    this.scheduleRender();
  }

  private applyEditMode() {
    const pre = this.contentDOM.parentElement as HTMLElement;
    pre.style.display = this.isEditing ? "" : "none";
    this.renderLayer.style.display = this.isEditing ? "none" : "";
  }

  protected scheduleRender() {
    const source = this.node.textContent;
    const token = ++this.renderToken;
    if (!source.trim()) {
      this.renderLayer.classList.remove("has-error");
      this.renderLayer.textContent = i18n.t("editor.editSource");
      return;
    }
    this.renderSource(source, token);
  }

  protected showFatalError(label: string, error: unknown) {
    this.renderLayer.classList.add("has-error");
    this.renderLayer.textContent = "";
    const box = document.createElement("div");
    box.className = "rendered-code-error";
    const message = error instanceof Error ? error.message : String(error);
    box.textContent = `${label}: ${message}`;
    this.renderLayer.appendChild(box);
  }

  protected abstract renderSource(source: string, token: number): void;
}

// ---- Mermaid 视图 ----
class MermaidBlockView extends RenderedCodeBlockView {
  private debounceTimer: number | null = null;
  private themeObserver: MutationObserver | null = null;

  constructor(node: PMNode, editor: Editor) {
    super(node, editor);
    this.themeObserver = new MutationObserver(() => {
      if (!this.isEditing) this.scheduleRender();
    });
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  protected onDestroy = () => {
    if (this.debounceTimer !== null) window.clearTimeout(this.debounceTimer);
    this.themeObserver?.disconnect();
  };

  protected renderSource(source: string, token: number) {
    if (this.debounceTimer !== null) window.clearTimeout(this.debounceTimer);
    this.debounceTimer = window.setTimeout(() => {
      this.debounceTimer = null;
      renderMermaidSvg(source)
        .then((svg) => {
          if (token !== this.renderToken) return;
          this.renderLayer.classList.remove("has-error");
          this.renderLayer.innerHTML = svg; // securityLevel: strict 已消毒
        })
        .catch((error: unknown) => {
          if (token !== this.renderToken) return;
          this.showFatalError(i18n.t("editor.mermaidRenderError"), error);
        });
    }, 500);
  }
}

// ---- KaTeX 视图(同步渲染) ----
class MathCodeBlockView extends RenderedCodeBlockView {
  protected renderSource(source: string, token: number) {
    const { html, error } = renderKatex(source, true);
    if (token !== this.renderToken) return;
    if (error) {
      this.showFatalError(i18n.t("editor.mathRenderError"), error);
      return;
    }
    this.renderLayer.classList.remove("has-error");
    this.renderLayer.innerHTML = html;
  }
}

// ---- Enter 创建围栏代码块 ----
// 原生 input rule(```lang + 空格)永远等不到回车:tiptap 内置 Keymap 扩展的
// handleEnter(newlineInCode/createParagraphNear/…/splitBlock)先于 input rules
// 的 Enter 支持执行,直接把段落 split。这里在扩展自己的 keymap 插件里拦截:
// 插件排序对 extensions 逆序后稳定排序,本扩展(注册序靠后)先于内置 Keymap。
// 仅当光标所在段落文本恰为 ```[lang] 时接管,其余情况回落到父级/原生行为。
const FENCE_ENTER_REGEX = /^(```|~~~)([a-z0-9_+-]+)?$/;

function createCodeBlockFromFence(editor: Editor): boolean {
  const { state } = editor;
  const { empty, $from } = state.selection;
  if (!empty || !$from.parent.isTextblock || $from.parent.type.spec.code) return false;
  const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, "￼");
  const match = FENCE_ENTER_REGEX.exec(textBefore);
  if (!match) return false;
  const codeBlockType = state.schema.nodes.codeBlock;
  if (!codeBlockType) return false;
  const blockStart = $from.before($from.depth);
  const blockEnd = $from.after($from.depth);
  const tr = state.tr.replaceWith(
    blockStart,
    blockEnd,
    codeBlockType.create({ language: match[2] || null }),
  );
  tr.setSelection(TextSelection.near(tr.doc.resolve(blockStart + 1)));
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}

// ---- 扩展:仅 mermaid/math 分支自定义 NodeView,其余语言返回 null(现有行为零变化) ----
export const EnhancedCodeBlock = CodeBlockLowlight.configure({ lowlight }).extend({
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const kind = resolveRenderedCodeLanguage(node.attrs.language);
      if (kind === "mermaid") return new MermaidBlockView(node, editor, getPos);
      if (kind === "math") return new MathCodeBlockView(node, editor, getPos);
      return null;
    };
  },
  addKeyboardShortcuts() {
    const parentShortcuts = this.parent?.() ?? {};
    return {
      ...parentShortcuts,
      Enter: ({ editor }) => {
        if (createCodeBlockFromFence(editor)) return true;
        const parentEnter = parentShortcuts.Enter;
        return typeof parentEnter === "function" ? parentEnter({ editor }) : false;
      },
    };
  },
  addProseMirrorPlugins() {
    // .extend 后 CodeBlockLowlight 的默认 addProseMirrorPlugins 会先调用 parent
    // (已 configure 实例,产出一份 LowlightPlugin)再追加自身,导致 lowlight 插件
    // 重复注册;重复的跨模块 DecorationSet 进入 prosemirror-view 的
    // DecorationGroup 扁平化时会产生 undefined 成员,编辑器挂载即崩溃。
    // 这里只透传 parent 链结果(CodeBlock 基类的插件 + 唯一一份 LowlightPlugin)。
    return this.parent?.() || [];
  },
});
