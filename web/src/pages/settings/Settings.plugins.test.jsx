import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Settings from "./Settings";
import { PluginProvider } from "@/core/plugins/PluginProvider";
import { createPluginRuntime } from "@/core/plugins/runtime";
import { renderWithLanguage } from "@/i18n/test-utils";

function manifest(id, overrides = {}) {
  return {
    id,
    name: id,
    version: "1.0.0",
    apiVersion: 1,
    main: "main.mjs",
    styles: [],
    defaultEnabled: true,
    ...overrides,
  };
}

function descriptor(id, origin, overrides = {}) {
  return {
    id,
    origin,
    manifest: manifest(id, overrides),
    status: "ok",
  };
}

function makeRuntime(plugins) {
  return createPluginRuntime({
    listPlugins: async () => ({ plugins, warnings: [] }),
    readPlugin: async (id) => ({
      id,
      origin: plugins.find((plugin) => plugin.id === id)?.origin ?? "official",
      manifest: plugins.find((plugin) => plugin.id === id)?.manifest ?? manifest(id),
      code: id,
      styles: [],
    }),
    importModule: async (url) => ({
      default: (ctx) => {
        ctx.editor.registerExtensions([
          ctx.pyramid.defineExtension({ name: `ext-${url}` }),
        ]);
      },
    }),
    makeUrl: (code) => `blob:${code}`,
    revokeUrl: () => {},
    doc: document,
  });
}

function renderSettings(runtime, language = "en") {
  return renderWithLanguage(
    <PluginProvider runtime={runtime}>
      <Settings />
    </PluginProvider>,
    language,
  );
}

beforeEach(() => {
  window.api = {
    getSettings: vi.fn().mockResolvedValue({
      theme: "system",
      storagePath: "/tmp/notes",
      autoUpdate: true,
      language: "system",
      plugins: { tasks: true },
    }),
    saveSettings: vi.fn().mockResolvedValue(true),
    selectDirectory: vi.fn(),
    getVersion: vi.fn().mockReturnValue("1.0.0"),
  };
  document.head
    .querySelectorAll("style[data-plugin-id]")
    .forEach((element) => element.remove());
});

describe("Settings plugins", () => {
  it("renders official and user plugins with origin badges", async () => {
    const runtime = makeRuntime([
      descriptor("tasks", "official", {
        nameKey: "settings.plugins.tasks.name",
        descriptionKey: "settings.plugins.tasks.description",
      }),
      descriptor("hello", "user", { name: "Hello plugin", defaultEnabled: true }),
    ]);

    await renderSettings(runtime);

    expect(await screen.findByText("Plugins")).toBeInTheDocument();
    expect(screen.getByText("Task list")).toBeInTheDocument();
    expect(screen.getByText("Hello plugin")).toBeInTheDocument();
    expect(screen.getByText("Official")).toBeInTheDocument();
    expect(screen.getByText("User")).toBeInTheDocument();
  });

  it("saves the whole plugins object when toggling tasks off", async () => {
    const user = userEvent.setup();
    const runtime = makeRuntime([descriptor("tasks", "official")]);

    await renderSettings(runtime);
    await screen.findByText("tasks");

    await user.click(screen.getByRole("button", { name: /^disabled$/i }));

    expect(window.api.saveSettings).toHaveBeenCalledWith({ plugins: { tasks: false } });
  });

  it("enables a user plugin explicitly", async () => {
    const user = userEvent.setup();
    const runtime = makeRuntime([descriptor("hello", "user")]);

    await renderSettings(runtime);
    await screen.findByText("hello");

    await user.click(screen.getByRole("button", { name: /^enabled$/i }));

    expect(window.api.saveSettings).toHaveBeenCalledWith({
      plugins: { tasks: true, hello: true },
    });
  });
});
