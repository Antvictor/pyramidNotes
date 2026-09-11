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
// 结构:div.rendered-code-block(.is-editing)> [pre(contentDOM)] + [div.rendered-code-view]
// 显隐靠 wrapper 上的 .is-editing class 走 CSS(见 markdown.css),不改 contentDOM 的 style。
// contentDOM 必须是 <pre> 本身,不能再套一层 <code>。
// 若 contentDOM 是 pre 内的 <code>,Chrome 的 contenteditable 编辑器在把内容删空时会
// 直接把这个空的内联 <code> 从 <pre> 里摘掉、换成 <br>(Blink 内部改 DOM,不走任何 JS API)。
// 该 mutation 的 target 是 <pre>、落在 contentDOM 之外 → 被本视图的 ignoreMutation 吞掉,
// ProseMirror 永远收不到这次结构变更 → desc.contentDOM 仍指向已被摘除的 <code>,
// 后续键入/删除全部写进脱离文档的元素 → 状态停在「删空前的最后一个字符」,
// 块既删不掉、渲染态还回放残留文本。contentDOM = <pre> 后,Chrome 的改动直接落在
// contentDOM 上,ignoreMutation 不再忽略、PM 能读到并自愈。
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
  // 记录选区是否曾进入本块:空块创建即编辑态,但此时选区尚未同步,
  // 避免第一条 selectionUpdate(选区仍在块外)把刚进入的编辑态立刻退掉
  protected sawSelectionInside = false;

  // 从实时文档取本节点,而不是只信 this.node 缓存。
  // prosemirror-view 的 CustomNodeViewDesc.update 在 dirty == NODE_DIRTY
  // (内容由 contentDOM 的 DOM 改动读回)时直接 return false,根本不会调用本视图的
  // update() → 缓存会停在「上一次编辑前」的文本。删除键的空判断、渲染内容都必须读
  // 实时文档,否则表现为「删空后按删除键没反应」以及「渲染出上一版残留文本」。
  protected liveNode(): PMNode {
    const pos = typeof this.getPos === "function" ? this.getPos() : undefined;
    if (pos == null) return this.node;
    const node = this.editor.state.doc.nodeAt(pos);
    if (!node || node.type !== this.node.type) return this.node;
    this.node = node;
    return node;
  }

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
    const pos = typeof this.getPos === "function" ? this.getPos() : undefined;
    if (pos == null) return;

    // 渲染态的删除键:stopEvent 让渲染层上的事件到不了 ProseMirror(eventBelongsToView 为假),
    // 只有恰好是 NodeSelection 时原生删除才生效;空源码的块于是可能永远删不掉(按删除键「没反应」)。
    // 源码为空时直接自删,与编辑态的删除语义一致。
    if (
      (event.key === "Backspace" || event.key === "Delete") &&
      this.liveNode().textContent.trim().length === 0
    ) {
      event.preventDefault();
      event.stopPropagation();
      this.deleteSelf();
      return;
    }

    const { selection } = this.editor.state;
    if (!(selection instanceof NodeSelection)) return;
    if (selection.from !== pos) return;
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

  // 渲染/编辑态跟随 ProseMirror 选区:
  // - 选区落在块内容区间内(原生 Backspace 从下一行进入、或 dblclick 后)→ 进编辑显示源码
  // - 编辑中选区离开本块(换行出去、点别处)→ 退出编辑并渲染,无需再点一下鼠标
  //
  // 必须同时挂 transaction:tiptap 只在选区「数值位置」变化时才发 selectionUpdate
  // (dispatchTransaction 里的 !oldSelection.eq(newSelection))。代码块三连回车退出时,
  // 选区从「块内末尾」映射到「新插入的空段落」,两处位置数值恰好相同 → 不发事件,
  // 于是块停在编辑态不渲染,直到下一次真正改变选区的操作为止。
  private syncEditState = () => {
    const pos = typeof this.getPos === "function" ? this.getPos() : undefined;
    if (pos == null) return;
    const { selection } = this.editor.state;
    const start = pos + 1;
    const end = pos + this.liveNode().nodeSize - 1;
    if (selection.from >= start && selection.to <= end) {
      this.sawSelectionInside = true;
      if (!this.isEditing) this.enterEdit();
      return;
    }
    if (this.isEditing && this.sawSelectionInside) this.exitEdit();
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (!this.isEditing) return;
    if (event.key === "Escape") {
      event.stopPropagation();
      this.exitEdit();
      return;
    }
    // 编辑态且源码为空(含只剩空白):直接删掉整块(替换为段落)。
    // 不依赖原生 keymap —— 原生的 clearNodes 依赖选区恰好落在块内,
    // 而双击进入编辑后 PM 选区常仍停在"整块"上,导致删除键无反应。
    // 空判断必须与构造函数/scheduleRender 一致(trim),否则只剩换行的块
    // 会被判成"非空",删除键既不删块也不回落,表现成"没反应"。
    if (
      (event.key === "Backspace" || event.key === "Delete") &&
      this.liveNode().textContent.trim().length === 0
    ) {
      event.preventDefault();
      event.stopPropagation();
      this.deleteSelf();
    }
  };

  // 删除自身(仅在源码为空时调用):替换为空段落并把光标放进去
  private deleteSelf() {
    const pos = typeof this.getPos === "function" ? this.getPos() : undefined;
    if (pos == null) return;
    const { state, dispatch } = this.editor.view;
    const paragraph = state.schema.nodes.paragraph;
    if (!paragraph) return;
    const tr = state.tr.replaceWith(pos, pos + this.liveNode().nodeSize, paragraph.create());
    tr.setSelection(TextSelection.near(tr.doc.resolve(pos), 1));
    dispatch(tr.scrollIntoView());
    // 被聚焦的 contentDOM 已随整块移除,不把 DOM 焦点还给编辑器就看不到光标
    this.editor.view.focus();
  }

  constructor(node: PMNode, editor: Editor, getPos?: () => number | undefined) {
    this.node = node;
    this.editor = editor;
    this.getPos = getPos;

    const pre = document.createElement("pre");
    pre.textContent = node.textContent;
    // contentDOM 就是 <pre> 本身(见类头注释:不能再套一层 <code>)
    this.contentDOM = pre;

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
    // 绑定在外层 dom 上:contentDOM 的按键会冒泡到这里,能一并接住
    this.dom.addEventListener("keydown", this.handleKeyDown);
    editor.on("transaction", this.syncEditState);
    editor.on("selectionUpdate", this.syncEditState);

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
    this.dom.removeEventListener("keydown", this.handleKeyDown);
    this.dom.removeEventListener("keydown", this.handleBlockKeyDown);
    this.editor.off("transaction", this.syncEditState);
    this.editor.off("selectionUpdate", this.syncEditState);
    this.onDestroy?.();
  }

  protected enterEdit() {
    if (this.isEditing || !this.editor.isEditable) return;
    const pos = typeof this.getPos === "function" ? this.getPos() : undefined;
    if (pos == null) return;
    this.isEditing = true;
    this.sawSelectionInside = true;
    this.renderToken += 1;
    this.applyEditMode();
    // 显式把 PM 选区放进块内:仅 contentDOM.focus() 时 PM 状态选区可能
    // 仍停在"整块"(NodeSelection),后续删除键会作用到整块而非源码
    const { state, dispatch } = this.editor.view;
    const start = pos + 1;
    const end = pos + this.liveNode().nodeSize - 1;
    if (!(state.selection.from >= start && state.selection.to <= end)) {
      dispatch(state.tr.setSelection(TextSelection.create(state.doc, start)));
    }
    this.contentDOM.focus();
  }

  protected exitEdit() {
    if (!this.isEditing) return;
    this.isEditing = false;
    this.applyEditMode();
    this.scheduleRender();
  }

  // 只在外层 wrapper 上切 class,绝不去动 contentDOM 自身的 style/属性。
  // contentDOM 现在就是 <pre>:给它设 inline display 是一条 target == contentDOM 的
  // attribute mutation,本视图的 ignoreMutation 不忽略它 → PM 读到「contentDOM 被改了」→
  // 把 desc 标脏并整块重建(NodeViewDesc 被 ViewTreeUpdater.addNode 换掉),
  // 渲染层 DOM、debounce 计时器、renderToken 全部丢失。切 wrapper 的 class 落在
  // contentDOM 之外,被 ignoreMutation 吞掉,PM 不重建。
  private applyEditMode() {
    this.dom.classList.toggle("is-editing", this.isEditing);
  }

  protected scheduleRender() {
    const source = this.liveNode().textContent;
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

  // getPos 必须透传给基类:漏了它 this.getPos 为 undefined,
  // syncEditState/enterEdit/deleteSelf 全部在 pos == null 处静默返回,
  // 表现为「边界删除后光标进去了但不显示源码」。
  constructor(node: PMNode, editor: Editor, getPos?: () => number | undefined) {
    super(node, editor, getPos);
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

// ---- 边界删除:紧贴渲染块的段落行首 Backspace / 行尾 Delete ----
// 原生 ProseMirror 会把相邻段落的文字并进代码块(joinBackward),污染源码。
// 这里改为:把选区放进块内进入编辑态(显示源码,不合并文本);
// 空块则直接删掉,与"空块无用"的语义一致。
function enterAdjacentRenderedBlock(editor: Editor, direction: "backward" | "forward"): boolean {
  const { state } = editor;
  const { empty, $from } = state.selection;
  if (!empty || !$from.parent.isTextblock || $from.parent.type.spec.code) return false;

  let pos: number;
  let node: PMNode | null;
  if (direction === "backward") {
    if ($from.parentOffset !== 0) return false;
    const boundary = $from.before($from.depth);
    node = state.doc.resolve(boundary).nodeBefore;
    if (!node) return false;
    pos = boundary - node.nodeSize;
  } else {
    if ($from.parentOffset !== $from.parent.content.size) return false;
    const boundary = $from.after($from.depth);
    node = state.doc.resolve(boundary).nodeAfter;
    if (!node) return false;
    pos = boundary;
  }
  if (node.type.name !== "codeBlock" || !resolveRenderedCodeLanguage(node.attrs.language)) return false;

  if (node.textContent.trim().length === 0) {
    const tr = state.tr.delete(pos, pos + node.nodeSize);
    tr.setSelection(TextSelection.near(tr.doc.resolve(pos), direction === "backward" ? 1 : -1));
    editor.view.dispatch(tr.scrollIntoView());
    return true;
  }

  const target = direction === "backward" ? pos + node.nodeSize - 1 : pos + 1;
  editor.view.dispatch(
    state.tr.setSelection(TextSelection.create(state.doc, target)).scrollIntoView(),
  );
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
    const runParent = (key: "Enter" | "Backspace" | "Delete", editor: Editor) => {
      const parent = parentShortcuts[key];
      return typeof parent === "function" ? parent({ editor }) : false;
    };
    return {
      ...parentShortcuts,
      Enter: ({ editor }) => createCodeBlockFromFence(editor) || runParent("Enter", editor),
      // 紧贴渲染块边界删除:进入块内编辑,而非把相邻段落文字并进源码
      Backspace: ({ editor }) =>
        enterAdjacentRenderedBlock(editor, "backward") || runParent("Backspace", editor),
      Delete: ({ editor }) =>
        enterAdjacentRenderedBlock(editor, "forward") || runParent("Delete", editor),
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
