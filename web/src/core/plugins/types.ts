import type { AnyExtension } from "@tiptap/core";
import {
  Extension,
  InputRule,
  Mark,
  Node,
  mergeAttributes,
} from "@tiptap/core";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Fragment } from "@tiptap/pm/model";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";

export const PLUGIN_API_VERSION = 1;

export const PYRAMID_PERMISSIONS = ["editor", "styles", "advanced"] as const;
export type PyramidPermission = (typeof PYRAMID_PERMISSIONS)[number];

export type PluginOrigin = "official" | "user";
export type PluginListStatus = "ok" | "incompatible";
export type PluginRuntimeStatus = "active" | "disabled" | "error" | "incompatible";

export interface ExternalPluginManifest {
  id: string;
  name?: string;
  description?: string;
  nameKey?: string;
  descriptionKey?: string;
  version: string;
  apiVersion: number;
  main: string;
  styles: string[];
  defaultEnabled: boolean;
  permissions?: PyramidPermission[];
}

export interface PluginDescriptor {
  id: string;
  origin: PluginOrigin;
  manifest: ExternalPluginManifest;
  status: PluginListStatus;
  reason?: string;
}

export type PluginToggles = Record<string, boolean>;

export interface PluginStyle {
  fileName: string;
  css: string;
}

export interface PluginReadResult {
  id: string;
  origin: PluginOrigin;
  manifest: ExternalPluginManifest;
  code: string;
  styles: PluginStyle[];
  warnings?: string[];
}

export type ExtensionSpec = Parameters<typeof Extension.create>[0];
export type NodeSpec = Parameters<typeof Node.create>[0];
export type MarkSpec = Parameters<typeof Mark.create>[0];
export type InputRuleConfig = ConstructorParameters<typeof InputRule>[0];

export interface PluginLog {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export interface PyramidAdvanced {
  defineProseMirrorPlugin: (config: ConstructorParameters<typeof Plugin>[0]) => Plugin;
  Plugin: typeof Plugin;
  PluginKey: typeof PluginKey;
  TextSelection: typeof TextSelection;
  Fragment: typeof Fragment;
  mergeAttributes: typeof mergeAttributes;
}

export interface PyramidApi {
  defineExtension: (spec: ExtensionSpec) => AnyExtension;
  defineNode: (spec: NodeSpec) => AnyExtension;
  defineMark: (spec: MarkSpec) => AnyExtension;
  defineInputRule: (config: InputRuleConfig) => InputRule;
  extensions?: {
    TaskList: typeof TaskList;
    TaskItem: typeof TaskItem;
  };
  advanced?: PyramidAdvanced;
}

export interface PluginContext {
  apiVersion: number;
  manifest: ExternalPluginManifest;
  log: PluginLog;
  editor?: {
    registerExtensions: (extensions: AnyExtension[]) => void;
  };
  ui?: {
    injectStyle: (css: string) => void;
  };
  pyramid: PyramidApi;
}

export interface PluginModule {
  default: (ctx: PluginContext) => void | (() => void);
}

export function isPluginEnabled(
  plugin: PluginDescriptor,
  toggles?: PluginToggles,
): boolean {
  const explicit = toggles?.[plugin.id];
  if (explicit !== undefined) return explicit;
  return plugin.origin === "official" ? plugin.manifest.defaultEnabled : false;
}
