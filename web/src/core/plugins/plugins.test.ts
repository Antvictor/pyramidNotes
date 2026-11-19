import { describe, expect, it } from "vitest";
import { Extension } from "@tiptap/core";
import {
  PLUGIN_API_VERSION,
  collectEnabledExtensions,
  isPluginEnabled,
  type PluginManifest,
} from "./types";

const ext = (name: string) => Extension.create({ name });

const manifest = (id: string, defaultEnabled: boolean): PluginManifest => ({
  id,
  nameKey: `settings.plugins.${id}.name`,
  descriptionKey: `settings.plugins.${id}.description`,
  apiVersion: PLUGIN_API_VERSION,
  defaultEnabled,
  createExtensions: () => [ext(id)],
});

describe("plugin registry", () => {
  it("uses defaultEnabled when the toggle is missing", () => {
    expect(isPluginEnabled(manifest("tasks", true))).toBe(true);
    expect(isPluginEnabled(manifest("tasks", false))).toBe(false);
    expect(isPluginEnabled(manifest("tasks", true), {})).toBe(true);
  });

  it("lets an explicit toggle win", () => {
    expect(isPluginEnabled(manifest("tasks", true), { tasks: false })).toBe(false);
    expect(isPluginEnabled(manifest("tasks", false), { tasks: true })).toBe(true);
  });

  it("collects only enabled manifests and ignores unknown ids", () => {
    const plugins = [manifest("tasks", true), manifest("other", false)];
    const names = collectEnabledExtensions(plugins, {
      tasks: false,
      other: true,
      ghost: true,
    }).map((extension) => extension.name);
    expect(names).toEqual(["other"]);
  });

  it("returns an empty list when every plugin is disabled", () => {
    expect(collectEnabledExtensions([manifest("tasks", true)], { tasks: false })).toEqual([]);
  });
});
