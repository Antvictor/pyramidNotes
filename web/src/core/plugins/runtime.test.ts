import { beforeEach, describe, expect, it, vi } from "vitest";
import { Extension } from "@tiptap/core";
import { createPluginRuntime, type PluginRuntimeSnapshot } from "./runtime";
import type { PluginContext, PluginDescriptor, PluginReadResult } from "./types";

function manifest(id: string, defaultEnabled = true) {
  return {
    id,
    name: id,
    version: "1.0.0",
    apiVersion: 1,
    main: "main.mjs",
    styles: ["styles.css"],
    defaultEnabled,
  };
}

function descriptor(
  id: string,
  origin: "official" | "user" = "official",
  defaultEnabled = true,
): PluginDescriptor {
  return { id, origin, manifest: manifest(id, defaultEnabled), status: "ok" };
}

interface SetupOptions {
  plugins?: PluginDescriptor[];
  warnings?: string[];
  readPlugin?: (id: string) => Promise<PluginReadResult | { error: unknown }>;
  importModule?: (url: string) => Promise<{ default?: unknown }>;
}

function setup(options: SetupOptions = {}) {
  const listPlugins = vi.fn(async () => ({
    plugins: options.plugins ?? [descriptor("alpha"), descriptor("beta", "user")],
    warnings: options.warnings ?? [],
  }));

  const readPlugin =
    options.readPlugin ??
    vi.fn(async (id: string): Promise<PluginReadResult> => ({
      id,
      origin: "official",
      manifest: manifest(id),
      code: id,
      styles: [{ fileName: "styles.css", css: `.${id} { color: red; }` }],
    }));

  const importModule =
    options.importModule ??
    vi.fn(async (url: string) => {
      const id = url.replace("blob:", "");
      return {
        default: (ctx: PluginContext) => {
          ctx.editor.registerExtensions([Extension.create({ name: `ext-${id}` })]);
        },
      };
    });

  const makeUrl = vi.fn((code: string) => `blob:${code}`);
  const revokeUrl = vi.fn();

  const runtime = createPluginRuntime({
    listPlugins,
    readPlugin,
    importModule,
    makeUrl,
    revokeUrl,
    doc: document,
  });

  return { runtime, listPlugins, readPlugin, importModule, makeUrl, revokeUrl };
}

function extensionNames(snapshot: PluginRuntimeSnapshot) {
  return snapshot.extensions.map((extension) => extension.name);
}

beforeEach(() => {
  document.head
    .querySelectorAll('style[data-plugin-id]')
    .forEach((element) => element.remove());
});

describe("createPluginRuntime", () => {
  it("loads official plugins first, sorted by id, and disables user plugins by default", async () => {
    const { runtime } = setup({
      plugins: [
        descriptor("beta", "user"),
        descriptor("gamma"),
        descriptor("alpha"),
      ],
    });

    const snapshot = await runtime.load({ storagePath: "a" });
    expect(extensionNames(snapshot)).toEqual(["ext-alpha", "ext-gamma"]);
    expect(snapshot.states.beta).toEqual({ status: "disabled" });
    expect(snapshot.states.alpha).toEqual({ status: "active" });
  });

  it("activates a user plugin when explicitly enabled", async () => {
    const { runtime } = setup({ plugins: [descriptor("beta", "user")] });
    const snapshot = await runtime.load({ storagePath: "a", plugins: { beta: true } });
    expect(extensionNames(snapshot)).toEqual(["ext-beta"]);
  });

  it("honours manifest defaultEnabled only for official plugins", async () => {
    const { runtime } = setup({
      plugins: [descriptor("alpha", "official", false), descriptor("beta", "user", true)],
    });
    const snapshot = await runtime.load({ storagePath: "a" });
    expect(snapshot.states.alpha).toEqual({ status: "disabled" });
    expect(snapshot.states.beta).toEqual({ status: "disabled" });
  });

  it("isolates a failing plugin from the others", async () => {
    const importModule = vi.fn(async (url: string) => {
      const id = url.replace("blob:", "");
      if (id === "bad") {
        return {
          default: () => {
            throw new Error("boom");
          },
        };
      }
      return {
        default: (ctx: PluginContext) => {
          ctx.editor.registerExtensions([Extension.create({ name: `ext-${id}` })]);
        },
      };
    });
    const { runtime } = setup({
      plugins: [descriptor("alpha"), descriptor("bad")],
      importModule,
    });

    const snapshot = await runtime.load({ storagePath: "a" });
    expect(extensionNames(snapshot)).toEqual(["ext-alpha"]);
    expect(snapshot.states.bad).toMatchObject({ status: "error", error: "boom" });
  });

  it("uses the manifest returned by readPlugin", async () => {
    let captured: PluginContext | null = null;
    const { runtime } = setup({
      plugins: [descriptor("alpha")],
      readPlugin: vi.fn(async () => ({
        id: "alpha",
        origin: "official" as const,
        manifest: { ...manifest("alpha"), name: "from-read" },
        code: "alpha",
        styles: [],
      })),
      importModule: vi.fn(async () => ({
        default: (ctx: PluginContext) => {
          captured = ctx;
        },
      })),
    });

    await runtime.load({ storagePath: "a" });
    expect(captured?.manifest.name).toBe("from-read");
  });

  it("injects styles once per active plugin and replaces them on reload", async () => {
    const { runtime, revokeUrl } = setup();

    await runtime.load({ storagePath: "a" });
    expect(document.querySelectorAll("style[data-plugin-id]").length).toBe(1);
    expect(document.querySelector('style[data-plugin-id="alpha"]')).not.toBeNull();
    expect(revokeUrl).toHaveBeenCalledTimes(1);

    await runtime.load({ storagePath: "a", plugins: { alpha: false, beta: true } });
    expect(document.querySelector('style[data-plugin-id="alpha"]')).toBeNull();
    expect(document.querySelector('style[data-plugin-id="beta"]')).not.toBeNull();
    expect(revokeUrl).toHaveBeenCalledTimes(2);
  });

  it("drops results from a stale load", async () => {
    let resolveFirstList: (value: unknown) => void = () => {};
    const firstList = new Promise((resolve) => {
      resolveFirstList = resolve;
    });
    const listPlugins = vi
      .fn()
      .mockImplementationOnce(() => firstList)
      .mockImplementationOnce(async () => ({
        plugins: [descriptor("gamma")],
        warnings: [],
      }));

    const runtime = createPluginRuntime({
      listPlugins,
      readPlugin: vi.fn(async (id: string) => ({
        id,
        origin: "official" as const,
        manifest: manifest(id),
        code: id,
        styles: [],
      })),
      importModule: vi.fn(async (url: string) => ({
        default: (ctx: PluginContext) => {
          ctx.editor.registerExtensions([
            Extension.create({ name: `ext-${url.replace("blob:", "")}` }),
          ]);
        },
      })),
      makeUrl: (code) => `blob:${code}`,
      revokeUrl: () => {},
      doc: document,
    });

    const first = runtime.load({ storagePath: "a" });
    const second = runtime.load({ storagePath: "b" });
    resolveFirstList({ plugins: [descriptor("alpha")], warnings: [] });
    await Promise.all([first, second]);

    const snapshot = await runtime.load({ storagePath: "b" });
    expect(extensionNames(snapshot)).toEqual(["ext-gamma"]);
    expect(document.querySelector('style[data-plugin-id="alpha"]')).toBeNull();
  });

  it("reuses an inflight load for the same key (StrictMode)", async () => {
    const { runtime, listPlugins } = setup({ plugins: [descriptor("alpha")] });
    const [left, right] = await Promise.all([
      runtime.load({ storagePath: "a" }),
      runtime.load({ storagePath: "a" }),
    ]);
    expect(listPlugins).toHaveBeenCalledTimes(1);
    expect(left).toBe(right);
  });
});
