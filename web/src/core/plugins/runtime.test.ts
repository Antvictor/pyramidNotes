import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPluginRuntime, type PluginRuntimeSnapshot } from "./runtime";
import type {
  PluginContext,
  PluginDescriptor,
  PluginReadResult,
  PyramidPermission,
} from "./types";

function manifest(
  id: string,
  defaultEnabled = true,
  permissions: PyramidPermission[] = ["editor"],
) {
  return {
    id,
    name: id,
    version: "1.0.0",
    apiVersion: 1,
    main: "main.mjs",
    styles: permissions.includes("styles") ? ["styles.css"] : [],
    defaultEnabled,
    permissions,
  };
}

function descriptor(
  id: string,
  origin: "official" | "user" = "official",
  defaultEnabled = true,
  permissions: PyramidPermission[] = ["editor"],
): PluginDescriptor {
  return { id, origin, manifest: manifest(id, defaultEnabled, permissions), status: "ok" };
}

interface SetupOptions {
  plugins?: PluginDescriptor[];
  warnings?: string[];
  readPlugin?: (id: string) => Promise<PluginReadResult | { error: unknown }>;
  importModule?: (url: string) => Promise<{ default?: unknown }>;
}

function setup(options: SetupOptions = {}) {
  const plugins = options.plugins ?? [descriptor("alpha"), descriptor("beta", "user")];
  const listPlugins = vi.fn(async () => ({
    plugins,
    warnings: options.warnings ?? [],
  }));

  const readPlugin =
    options.readPlugin ??
    vi.fn(async (id: string): Promise<PluginReadResult> => {
      const found = plugins.find((plugin) => plugin.id === id);
      return {
        id,
        origin: found?.origin ?? "official",
        manifest: found?.manifest ?? manifest(id),
        code: id,
        styles: [{ fileName: "styles.css", css: `.${id} { color: red; }` }],
      };
    });

  const importModule =
    options.importModule ??
    vi.fn(async (url: string) => {
      const id = url.replace("blob:", "");
      return {
        default: (ctx: PluginContext) => {
          const extension = ctx.pyramid.defineExtension({ name: `ext-${id}` });
          ctx.editor?.registerExtensions([extension]);
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
          ctx.editor?.registerExtensions([ctx.pyramid.defineExtension({ name: `ext-${id}` })]);
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

  it("defaults to editor permission and hides undeclared capabilities", async () => {
    let captured: PluginContext | null = null;
    const { runtime } = setup({
      plugins: [descriptor("alpha", "official", true, ["editor"])],
      importModule: vi.fn(async () => ({
        default: (ctx: PluginContext) => {
          captured = ctx;
        },
      })),
    });

    await runtime.load({ storagePath: "a" });
    expect(captured?.editor).toBeDefined();
    expect(captured?.ui).toBeUndefined();
    expect(captured?.pyramid.advanced).toBeUndefined();
    expect(captured?.pyramid.extensions).toBeDefined();
    expect(captured?.log).toBeDefined();
    expect(captured?.pyramid.defineExtension).toBeTypeOf("function");
  });

  it("injects advanced capabilities only when the advanced permission is declared", async () => {
    const contexts: PluginContext[] = [];
    const { runtime } = setup({
      plugins: [
        descriptor("plain", "official", true, ["editor"]),
        descriptor("advanced", "official", true, ["editor", "advanced"]),
      ],
      importModule: vi.fn(async () => ({
        default: (ctx: PluginContext) => {
          contexts.push(ctx);
        },
      })),
    });

    await runtime.load({ storagePath: "a" });
    const plain = contexts.find((ctx) => ctx.manifest.id === "plain");
    const advanced = contexts.find((ctx) => ctx.manifest.id === "advanced");
    expect(plain?.pyramid.advanced).toBeUndefined();
    expect(advanced?.pyramid.advanced).toBeDefined();
    expect(advanced?.pyramid.advanced?.Plugin).toBeTypeOf("function");
    expect(advanced?.pyramid.advanced?.defineProseMirrorPlugin).toBeTypeOf("function");
  });

  it("prefixes log output with the plugin id", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const { runtime } = setup({
      plugins: [descriptor("alpha")],
      importModule: vi.fn(async () => ({
        default: (ctx: PluginContext) => {
          ctx.log.info("hello");
        },
      })),
    });

    await runtime.load({ storagePath: "a" });
    expect(info).toHaveBeenCalledWith("[plugin:alpha]", "hello");
    info.mockRestore();
  });

  it("only injects manifest styles when the styles permission is declared", async () => {
    const { runtime } = setup({
      plugins: [
        descriptor("plain", "official", true, ["editor"]),
        descriptor("styled", "official", true, ["editor", "styles"]),
      ],
    });

    await runtime.load({ storagePath: "a" });
    expect(document.querySelector('style[data-plugin-id="plain"]')).toBeNull();
    expect(document.querySelector('style[data-plugin-id="styled"]')).not.toBeNull();
  });

  it("injects styles once per active plugin and replaces them on reload", async () => {
    const { runtime, revokeUrl } = setup({
      plugins: [
        descriptor("alpha", "official", true, ["editor", "styles"]),
        descriptor("beta", "user", true, ["editor", "styles"]),
      ],
    });

    await runtime.load({ storagePath: "a" });
    expect(document.querySelector('style[data-plugin-id="alpha"]')).not.toBeNull();
    expect(document.querySelector('style[data-plugin-id="beta"]')).toBeNull();
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
          ctx.editor?.registerExtensions([
            ctx.pyramid.defineExtension({ name: `ext-${url.replace("blob:", "")}` }),
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
