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

export interface PluginContext {
  id: string;
  apiVersion: number;
  manifest: ExternalPluginManifest;
  tiptap: {
    Extension: typeof Extension;
    Node: typeof Node;
    Mark: typeof Mark;
    InputRule: typeof InputRule;
    mergeAttributes: typeof mergeAttributes;
    Plugin: typeof Plugin;
    PluginKey: typeof PluginKey;
    TextSelection: typeof TextSelection;
    Fragment: typeof Fragment;
    extensions: {
      TaskList: typeof TaskList;
      TaskItem: typeof TaskItem;
    };
  };
  editor: {
    registerExtensions: (extensions: AnyExtension[]) => void;
  };
  ui: {
    injectStyle: (css: string) => void;
  };
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
