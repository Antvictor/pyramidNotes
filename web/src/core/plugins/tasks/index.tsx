import { TaskItem } from "@tiptap/extension-list";
import { PLUGIN_API_VERSION, type PluginManifest } from "../types";
import { TaskListConversion } from "./taskListConversion";
import { TaskListMarkdown } from "./taskListMarkdown";
import { TaskListTight } from "./taskListTight";
import "./tasks.css";

export const tasksPlugin: PluginManifest = {
  id: "tasks",
  nameKey: "settings.plugins.tasks.name",
  descriptionKey: "settings.plugins.tasks.description",
  apiVersion: PLUGIN_API_VERSION,
  defaultEnabled: true,
  createExtensions: () => [
    TaskListMarkdown,
    TaskItem.configure({ nested: true }),
    TaskListTight,
    TaskListConversion,
  ],
};
