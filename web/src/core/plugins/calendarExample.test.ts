import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import StarterKit from "@tiptap/starter-kit";
import {
  Editor,
  Extension,
  InputRule,
  Mark,
  Node,
  mergeAttributes,
  type AnyExtension,
} from "@tiptap/core";
import { Fragment } from "@tiptap/pm/model";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import type { PluginContext } from "./types";

const require = createRequire(import.meta.url);
const { validateManifest } = require("../../../../electron/common/pluginManifest.cjs");
const exampleDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../docs/examples/calendar-date",
);

let extensions: AnyExtension[] = [];
let manifest: PluginContext["manifest"];

beforeAll(async () => {
  const code = readFileSync(path.join(exampleDir, "main.mjs"), "utf8");
  const dataUrl = `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
  const module = await import(/* @vite-ignore */ dataUrl);
  manifest = JSON.parse(readFileSync(path.join(exampleDir, "manifest.json"), "utf8"));

  const collected: AnyExtension[] = [];
  const ctx: PluginContext = {
    apiVersion: 1,
    manifest,
    log: { info: () => {}, warn: () => {}, error: () => {} },
    editor: {
      registerExtensions: (list) => collected.push(...list),
    },
    ui: { injectStyle: () => {} },
    pyramid: {
      defineExtension: (spec) => Extension.create(spec),
      defineNode: (spec) => Node.create(spec),
      defineMark: (spec) => Mark.create(spec),
      defineInputRule: (config) => new InputRule(config),
      extensions: { TaskList, TaskItem },
      advanced: {
        defineProseMirrorPlugin: (config) => new Plugin(config),
        Plugin,
        PluginKey,
        TextSelection,
        Fragment,
        mergeAttributes,
      },
    },
  };

  await module.default(ctx);
  extensions = collected;
});

function makeEditor() {
  return new Editor({
    extensions: [
      StarterKit.configure({ code: false, codeBlock: false, hardBreak: false }),
      ...extensions,
    ],
    content: "",
    element: document.createElement("div"),
  });
}

function typeText(editor: Editor, text: string) {
  for (const char of text) {
    const { from, to } = editor.state.selection;
    const handled = editor.view.someProp("handleTextInput", (handler) =>
      handler(editor.view, from, to, char),
    );
    if (!handled) {
      editor.view.dispatch(editor.state.tr.insertText(char, from, to));
    }
  }
}

describe("calendar-date example plugin", () => {
  it("has a valid manifest with editor and styles permissions", () => {
    const result = validateManifest(
      JSON.parse(readFileSync(path.join(exampleDir, "manifest.json"), "utf8")),
      "calendar-date",
    );
    expect(result.ok).toBe(true);
    expect(result.manifest.permissions).toEqual(["editor", "styles"]);
  });

  it("registers a calendarDate node and renders its NodeView", () => {
    const editor = makeEditor();
    editor.commands.insertContent({
      type: "calendarDate",
      attrs: { date: "2026-11-19" },
    });

    let node = null;
    editor.state.doc.descendants((candidate) => {
      if (candidate.type.name === "calendarDate") node = candidate;
    });
    expect(node).not.toBeNull();
    expect(node!.attrs.date).toBe("2026-11-19");
    expect(node!.attrs.date).toBe("2026-11-19");
    expect(editor.view.dom.querySelector(".calendar-date")).not.toBeNull();
    editor.destroy();
  });

  it("inserts today's date when typing @today", () => {
    const editor = makeEditor();
    editor.commands.focus("end");
    typeText(editor, "@today ");

    let node = null;
    editor.state.doc.descendants((candidate) => {
      if (candidate.type.name === "calendarDate") node = candidate;
    });
    const today = new Date().toISOString().slice(0, 10);
    expect(node).not.toBeNull();
    expect(node!.attrs.date).toBe(today);
    editor.destroy();
  });
});
