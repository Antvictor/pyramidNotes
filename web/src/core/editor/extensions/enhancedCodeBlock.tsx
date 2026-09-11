import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
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
abstract class RenderedCodeBlockView implements NodeView {
  node: PMNode;
  editor: Editor;
  dom: HTMLElement;
  contentDOM: HTMLElement;
  protected renderLayer: HTMLElement;
  protected renderToken = 0;
  protected isEditing = false;
  protected onDestroy: (() => void) | null = null;

  private handleDocumentMouseDown = (event: MouseEvent) => {
    if (!this.isEditing) return;
    if (event.target instanceof Node && this.dom.contains(event.target)) return;
    this.exitEdit();
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    this.exitEdit();
  };

  constructor(node: PMNode, editor: Editor) {
    this.node = node;
    this.editor = editor;

    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.textContent = node.textContent;
    pre.appendChild(code);
    this.contentDOM = code;

    this.renderLayer = document.createElement("div");
    this.renderLayer.className = "rendered-code-view";
    this.renderLayer.title = i18n.t("editor.editSource");
    this.renderLayer.addEventListener("dblclick", () => this.enterEdit());

    this.dom = document.createElement("div");
    this.dom.className = "rendered-code-block";
    this.dom.append(pre, this.renderLayer);

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

  ignoreMutation(mutation: MutationRecord): boolean {
    // contentDOM 之外的变更(渲染层 innerHTML)由视图自行管理
    return !this.contentDOM.contains(mutation.target) && mutation.target !== this.contentDOM;
  }

  destroy(): void {
    this.renderToken += 1; // 使进行中的异步渲染失效
    document.removeEventListener("mousedown", this.handleDocumentMouseDown, true);
    this.contentDOM.removeEventListener("keydown", this.handleKeyDown);
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

// ---- 扩展:仅 mermaid/math 分支自定义 NodeView,其余语言返回 null(现有行为零变化) ----
export const EnhancedCodeBlock = CodeBlockLowlight.configure({ lowlight }).extend({
  addNodeView() {
    return ({ node, editor }) => {
      const kind = resolveRenderedCodeLanguage(node.attrs.language);
      if (kind === "mermaid") return new MermaidBlockView(node, editor);
      if (kind === "math") return new MathCodeBlockView(node, editor);
      return null;
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
