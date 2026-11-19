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
import {
  PLUGIN_API_VERSION,
  isPluginEnabled,
  type ExternalPluginManifest,
  type PluginContext,
  type PluginDescriptor,
  type PluginLog,
  type PluginModule,
  type PluginReadResult,
  type PluginRuntimeStatus,
  type PluginStyle,
  type PluginToggles,
  type PyramidApi,
  type PyramidPermission,
} from "./types";

export interface PluginRuntimeSnapshot {
  descriptors: PluginDescriptor[];
  states: Record<string, { status: PluginRuntimeStatus; error?: string }>;
  extensions: AnyExtension[];
  warnings: string[];
}

export interface PluginRuntimeInput {
  storagePath?: string;
  plugins?: PluginToggles;
}

interface RuntimeDeps {
  listPlugins: () => Promise<{
    plugins?: PluginDescriptor[];
    warnings?: string[];
    error?: unknown;
  }>;
  readPlugin: (id: string) => Promise<PluginReadResult | { error: unknown }>;
  importModule?: (url: string) => Promise<Partial<PluginModule>>;
  makeUrl?: (code: string) => string;
  revokeUrl?: (url: string) => void;
  doc?: Document;
}

function emptySnapshot(warnings: string[] = []): PluginRuntimeSnapshot {
  return { descriptors: [], states: {}, extensions: [], warnings };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createPluginRuntime(deps: RuntimeDeps) {
  const importModule =
    deps.importModule ?? ((url: string) => import(/* @vite-ignore */ url));
  const makeUrl =
    deps.makeUrl ??
    ((code: string) =>
      URL.createObjectURL(new Blob([code], { type: "text/javascript" })));
  const revokeUrl =
    deps.revokeUrl ?? ((url: string) => URL.revokeObjectURL(url));

  const getDoc = () =>
    deps.doc ?? (typeof document === "undefined" ? undefined : document);

  let generation = 0;
  let snapshot: PluginRuntimeSnapshot | null = null;
  let lastKey = "";
  let inflightKey = "";
  let inflight: Promise<PluginRuntimeSnapshot> | null = null;

  function removeStyles() {
    const doc = getDoc();
    if (!doc) return;
    doc.querySelectorAll("style[data-plugin-id]").forEach((element) => element.remove());
  }

  function applyStyles(id: string, styles: PluginStyle[]) {
    const doc = getDoc();
    if (!doc) return;
    for (const style of styles) {
      const element = doc.createElement("style");
      element.setAttribute("data-plugin-id", id);
      element.textContent = style.css;
      doc.head.appendChild(element);
    }
  }

  function injectInlineStyle(id: string, css: string) {
    const doc = getDoc();
    if (!doc) return;
    const selector = `style[data-plugin-id="${id}"][data-inline="true"]`;
    let element = doc.querySelector<HTMLStyleElement>(selector);
    if (!element) {
      element = doc.createElement("style");
      element.setAttribute("data-plugin-id", id);
      element.setAttribute("data-inline", "true");
      doc.head.appendChild(element);
    }
    element.textContent = css;
  }

  function buildContext(
    manifest: ExternalPluginManifest,
    collected: AnyExtension[],
  ): PluginContext {
    const permissions = manifest.permissions ?? ["editor"];
    const has = (permission: PyramidPermission) => permissions.includes(permission);

    const log: PluginLog = {
      info: (...args) => console.info(`[plugin:${manifest.id}]`, ...args),
      warn: (...args) => console.warn(`[plugin:${manifest.id}]`, ...args),
      error: (...args) => console.error(`[plugin:${manifest.id}]`, ...args),
    };

    const pyramid: PyramidApi = {
      defineExtension: (spec) => Extension.create(spec),
      defineNode: (spec) => Node.create(spec),
      defineMark: (spec) => Mark.create(spec),
      defineInputRule: (config) => new InputRule(config),
      ...(has("editor") ? { extensions: { TaskList, TaskItem } } : {}),
      ...(has("advanced")
        ? {
            advanced: {
              defineProseMirrorPlugin: (config) => new Plugin(config),
              Plugin,
              PluginKey,
              TextSelection,
              Fragment,
              mergeAttributes,
            },
          }
        : {}),
    };

    const context: PluginContext = {
      apiVersion: PLUGIN_API_VERSION,
      manifest,
      log,
      pyramid,
    };

    if (has("editor")) {
      context.editor = {
        registerExtensions: (extensions) => {
          collected.push(...extensions);
        },
      };
    }
    if (has("styles")) {
      context.ui = {
        injectStyle: (css) => injectInlineStyle(manifest.id, css),
      };
    }

    return context;
  }

  async function run(
    input: PluginRuntimeInput,
    key: string,
  ): Promise<PluginRuntimeSnapshot> {
    const current = ++generation;

    let listing: Awaited<ReturnType<RuntimeDeps["listPlugins"]>>;
    try {
      listing = await deps.listPlugins();
    } catch (error) {
      if (current !== generation) return snapshot ?? emptySnapshot();
      lastKey = key;
      snapshot = emptySnapshot([messageOf(error)]);
      return snapshot;
    }
    if (current !== generation) return snapshot ?? emptySnapshot();
    if (listing.error) {
      lastKey = key;
      snapshot = emptySnapshot([messageOf(listing.error)]);
      return snapshot;
    }

    const descriptors = listing.plugins ?? [];
    const warnings = [...(listing.warnings ?? [])];
    const states: PluginRuntimeSnapshot["states"] = {};
    const extensions: AnyExtension[] = [];

    removeStyles();

    const ordered = [...descriptors].sort((left, right) => {
      if (left.origin !== right.origin) {
        return left.origin === "official" ? -1 : 1;
      }
      return left.id.localeCompare(right.id);
    });

    for (const descriptor of ordered) {
      const id = descriptor.id;
      if (descriptor.status === "incompatible") {
        states[id] = { status: "incompatible", error: descriptor.reason };
        continue;
      }
      if (!isPluginEnabled(descriptor, input.plugins)) {
        states[id] = { status: "disabled" };
        continue;
      }

      try {
        const read = await deps.readPlugin(id);
        if (current !== generation) return snapshot ?? emptySnapshot();
        if ("error" in read) {
          states[id] = { status: "error", error: messageOf(read.error) };
          continue;
        }

        const url = makeUrl(read.code);
        try {
          const module = await importModule(url);
          if (current !== generation) return snapshot ?? emptySnapshot();
          const activate = module?.default;
          if (typeof activate !== "function") {
            throw new Error("plugin must default-export activate(ctx)");
          }
          const collected: AnyExtension[] = [];
          activate(buildContext(read.manifest, collected));
          if (current !== generation) return snapshot ?? emptySnapshot();
          extensions.push(...collected);
          const permissions = read.manifest.permissions ?? ["editor"];
          if (permissions.includes("styles")) {
            applyStyles(id, read.styles ?? []);
          }
          states[id] = { status: "active" };
        } finally {
          revokeUrl(url);
        }
      } catch (error) {
        states[id] = { status: "error", error: messageOf(error) };
      }
    }

    if (current !== generation) return snapshot ?? emptySnapshot();
    lastKey = key;
    snapshot = { descriptors, states, extensions, warnings };
    return snapshot;
  }

  function load(input: PluginRuntimeInput = {}): Promise<PluginRuntimeSnapshot> {
    const key = `${input.storagePath ?? ""}|${JSON.stringify(input.plugins ?? {})}`;
    if (key === lastKey && snapshot) return Promise.resolve(snapshot);
    if (inflight && inflightKey === key) return inflight;

    inflightKey = key;
    const promise = run(input, key).finally(() => {
      if (inflightKey === key) {
        inflight = null;
        inflightKey = "";
      }
    });
    inflight = promise;
    return promise;
  }

  function dispose() {
    removeStyles();
    snapshot = null;
    lastKey = "";
    generation += 1;
  }

  return { load, dispose };
}
