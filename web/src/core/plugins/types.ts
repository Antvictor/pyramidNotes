import type { AnyExtension } from "@tiptap/core";

export const PLUGIN_API_VERSION = 1;

export interface PluginManifest {
  id: string;
  nameKey: string;
  descriptionKey: string;
  apiVersion: number;
  defaultEnabled: boolean;
  createExtensions: () => AnyExtension[];
}

export type PluginToggles = Record<string, boolean>;

export function isPluginEnabled(plugin: PluginManifest, toggles?: PluginToggles): boolean {
  return toggles?.[plugin.id] ?? plugin.defaultEnabled;
}

export function collectEnabledExtensions(
  plugins: PluginManifest[],
  toggles?: PluginToggles,
): AnyExtension[] {
  return plugins
    .filter((plugin) => isPluginEnabled(plugin, toggles))
    .flatMap((plugin) => plugin.createExtensions());
}
