import type { PluginManifest } from "./types";
import { tasksPlugin } from "./tasks";

export const bundledPlugins: PluginManifest[] = [tasksPlugin];
