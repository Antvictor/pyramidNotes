// Pyramid Notes 插件作者类型（apiVersion: 1）
// 本文件不依赖 TipTap / ProseMirror 包，仅用于编辑器提示与文档。

export type PyPermission = "editor" | "styles" | "advanced";

export interface PluginManifest {
  id: string;
  name?: string;
  description?: string;
  nameKey?: string;
  descriptionKey?: string;
  version: string;
  apiVersion: number;
  main: string;
  styles?: string[];
  defaultEnabled: boolean;
  permissions?: PyPermission[];
}

/** 由 defineExtension / defineNode / defineMark 返回的不透明扩展对象 */
export interface PyExtension {
  readonly name: string;
}

/** 扩展配置：常用字段；其余字段按宿主实现透传 */
export interface ExtensionSpec {
  name: string;
  addAttributes?: () => Record<string, { default?: unknown; parseHTML?: unknown; renderHTML?: unknown }>;
  parseHTML?: () => Array<Record<string, unknown>>;
  renderHTML?: (props: { node: { attrs: Record<string, unknown> }; HTMLAttributes: Record<string, unknown> }) => unknown;
  addNodeView?: () => (props: {
    node: { attrs: Record<string, unknown> };
    editor: {
      view: {
        state: { tr: { setNodeMarkup(pos: number, type: undefined, attrs: Record<string, unknown>): unknown } };
        dispatch(tr: unknown): void;
      };
    };
    getPos: () => number | undefined;
  }) => Record<string, unknown>;
  addInputRules?: () => unknown[];
  addProseMirrorPlugins?: () => unknown[];
  addKeyboardShortcuts?: () => Record<string, (props: unknown) => boolean>;
  addStorage?: () => Record<string, unknown>;
  [key: string]: unknown;
}

/** 宿主提供的扩展对象（TaskList / TaskItem） */
export interface HostExtension extends PyExtension {
  extend(spec: ExtensionSpec): HostExtension;
  configure(options?: Record<string, unknown>): HostExtension;
}

export interface InputRuleConfig {
  find: RegExp;
  handler: (props: {
    state: {
      schema: { text(text: string): unknown };
      tr: { replaceWith(from: number, to: number, content: unknown): void };
    };
    range: { from: number; to: number };
    match: readonly string[];
  }) => void;
}

export interface PyramidAdvanced {
  defineProseMirrorPlugin(config: Record<string, unknown>): unknown;
  Plugin: unknown;
  PluginKey: unknown;
  TextSelection: unknown;
  Fragment: unknown;
  mergeAttributes: unknown;
}

export interface PyramidApi {
  defineExtension(spec: ExtensionSpec): PyExtension;
  defineNode(spec: ExtensionSpec): PyExtension;
  defineMark(spec: ExtensionSpec): PyExtension;
  defineInputRule(config: InputRuleConfig): unknown;
  /** 需要 editor 权限 */
  extensions?: {
    TaskList: HostExtension;
    TaskItem: HostExtension;
  };
  /** 需要 advanced 权限（同时需要 editor） */
  advanced?: PyramidAdvanced;
}

export interface PluginLog {
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export interface PluginContext {
  apiVersion: number;
  manifest: PluginManifest;
  log: PluginLog;
  /** 需要 editor 权限 */
  editor?: {
    registerExtensions(extensions: PyExtension[]): void;
  };
  /** 需要 styles 权限 */
  ui?: {
    injectStyle(css: string): void;
  };
  pyramid: PyramidApi;
}

export interface PluginModule {
  default(ctx: PluginContext): void | (() => void);
}
