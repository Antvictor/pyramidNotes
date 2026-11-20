import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  CATEGORY_SCOPES,
  matchShortcut,
  isCategoryActive,
  isEditableTarget,
  useShortcutActions,
} from "./useShortcuts.js";

const keydown = (props) => new KeyboardEvent("keydown", { bubbles: true, ...props });

describe("matchShortcut", () => {
  it("matches Ctrl+K", () => {
    expect(matchShortcut({ ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, key: "k" }, "Ctrl+K")).toBe(true);
  });

  it("treats Cmd as Ctrl", () => {
    expect(matchShortcut({ ctrlKey: false, metaKey: true, shiftKey: false, altKey: false, key: "k" }, "Ctrl+K")).toBe(true);
  });

  it("matches Escape without modifiers", () => {
    expect(matchShortcut({ ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, key: "Escape" }, "Escape")).toBe(true);
  });

  it("matches Enter and Tab", () => {
    const base = { ctrlKey: false, metaKey: false, shiftKey: false, altKey: false };
    expect(matchShortcut({ ...base, key: "Enter" }, "Enter")).toBe(true);
    expect(matchShortcut({ ...base, key: "Tab" }, "Tab")).toBe(true);
  });

  it("matches Ctrl+Space via the space character", () => {
    expect(matchShortcut({ ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, key: " " }, "Ctrl+Space")).toBe(true);
  });

  it("requires Alt to be declared explicitly", () => {
    expect(matchShortcut({ ctrlKey: true, metaKey: false, shiftKey: false, altKey: true, key: "k" }, "Ctrl+K")).toBe(false);
    expect(matchShortcut({ ctrlKey: true, metaKey: false, shiftKey: false, altKey: true, key: "k" }, "Ctrl+Alt+K")).toBe(true);
  });

  it("does not match when a declared modifier is missing", () => {
    expect(matchShortcut({ ctrlKey: false, metaKey: false, shiftKey: true, altKey: false, key: "v" }, "Ctrl+Shift+V")).toBe(false);
  });

  it("does not match empty bindings", () => {
    expect(matchShortcut({ ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, key: "k" }, "")).toBe(false);
  });
});

describe("isCategoryActive", () => {
  it("maps categories to scopes", () => {
    expect(CATEGORY_SCOPES).toEqual({ global: "all", node: "mindmap", note: "note" });
    expect(isCategoryActive("node", "mindmap")).toBe(true);
    expect(isCategoryActive("node", "note")).toBe(false);
    expect(isCategoryActive("note", "note")).toBe(true);
    expect(isCategoryActive("note", "mindmap")).toBe(false);
    expect(isCategoryActive("global", "mindmap")).toBe(true);
    expect(isCategoryActive("global", "note")).toBe(true);
  });

  it("does not activate unknown categories", () => {
    expect(isCategoryActive("unknown", "mindmap")).toBe(false);
    expect(isCategoryActive("unknown", "note")).toBe(false);
  });
});

describe("isEditableTarget", () => {
  const cleanup = [];
  const mount = (el) => {
    document.body.appendChild(el);
    cleanup.push(el);
    return el;
  };

  afterEach(() => {
    while (cleanup.length) cleanup.pop().remove();
  });

  it("detects input, textarea, select and contenteditable", () => {
    expect(isEditableTarget(mount(document.createElement("input")))).toBe(true);
    expect(isEditableTarget(mount(document.createElement("textarea")))).toBe(true);
    expect(isEditableTarget(mount(document.createElement("select")))).toBe(true);
    const editable = mount(document.createElement("div"));
    editable.setAttribute("contenteditable", "true");
    const inner = document.createElement("span");
    editable.appendChild(inner);
    expect(isEditableTarget(inner)).toBe(true);
  });

  it("returns false for regular elements and null", () => {
    expect(isEditableTarget(mount(document.createElement("div")))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});

describe("useShortcutActions", () => {
  const extraNodes = [];
  const mountNode = (el) => {
    document.body.appendChild(el);
    extraNodes.push(el);
    return el;
  };
  const shortcuts = {
    global: { search: "Ctrl+K" },
    node: { newNode: "Ctrl+N", newSibling: "Enter" },
    note: { bold: "Ctrl+B" },
  };

  afterEach(() => {
    while (extraNodes.length) extraNodes.pop().remove();
    vi.restoreAllMocks();
  });

  it("dispatches node actions on the mindmap scope", () => {
    const newNode = vi.fn();
    renderHook(() => useShortcutActions({ shortcuts, scope: "mindmap", handlers: { newNode } }));
    window.dispatchEvent(keydown({ key: "n", ctrlKey: true }));
    expect(newNode).toHaveBeenCalledTimes(1);
  });

  it("does not dispatch node actions on the note scope but keeps global ones", () => {
    const newNode = vi.fn();
    const search = vi.fn();
    renderHook(() => useShortcutActions({ shortcuts, scope: "note", handlers: { newNode, search } }));
    window.dispatchEvent(keydown({ key: "n", ctrlKey: true }));
    expect(newNode).not.toHaveBeenCalled();
    window.dispatchEvent(keydown({ key: "k", ctrlKey: true }));
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("ignores non-global actions from editable targets but keeps global ones", () => {
    const newNode = vi.fn();
    const search = vi.fn();
    renderHook(() => useShortcutActions({ shortcuts, scope: "mindmap", handlers: { newNode, search } }));
    const input = mountNode(document.createElement("input"));
    input.dispatchEvent(keydown({ key: "n", ctrlKey: true }));
    input.dispatchEvent(keydown({ key: "Enter" }));
    expect(newNode).not.toHaveBeenCalled();
    input.dispatchEvent(keydown({ key: "k", ctrlKey: true }));
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("blocks non-global actions while blocked but keeps global ones", () => {
    const newNode = vi.fn();
    const search = vi.fn();
    renderHook(() => useShortcutActions({ shortcuts, scope: "mindmap", blocked: true, handlers: { newNode, search } }));
    window.dispatchEvent(keydown({ key: "n", ctrlKey: true }));
    expect(newNode).not.toHaveBeenCalled();
    window.dispatchEvent(keydown({ key: "k", ctrlKey: true }));
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("blocks non-global actions while a Radix dialog is open", () => {
    const newNode = vi.fn();
    renderHook(() => useShortcutActions({ shortcuts, scope: "mindmap", handlers: { newNode } }));
    const dialog = mountNode(document.createElement("div"));
    dialog.setAttribute("data-slot", "dialog-content");
    dialog.setAttribute("data-state", "open");
    window.dispatchEvent(keydown({ key: "n", ctrlKey: true }));
    expect(newNode).not.toHaveBeenCalled();
  });

  it("ignores repeated keydown events", () => {
    const newNode = vi.fn();
    renderHook(() => useShortcutActions({ shortcuts, scope: "mindmap", handlers: { newNode } }));
    window.dispatchEvent(keydown({ key: "n", ctrlKey: true, repeat: true }));
    expect(newNode).not.toHaveBeenCalled();
  });

  it("skips bindings without a registered handler", () => {
    renderHook(() => useShortcutActions({ shortcuts, scope: "mindmap", handlers: {} }));
    expect(() => window.dispatchEvent(keydown({ key: "Enter" }))).not.toThrow();
  });
});
