import { describe, expect, it } from "vitest";
import { matchShortcut } from "./useShortcuts.js";

describe("matchShortcut", () => {
  it("matches Ctrl+K", () => {
    expect(
      matchShortcut({ ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, key: "k" }, "Ctrl+K"),
    ).toBe(true);
  });

  it("matches Escape without modifiers", () => {
    expect(
      matchShortcut({ ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, key: "Escape" }, "Escape"),
    ).toBe(true);
  });

  it("does not match when modifier missing", () => {
    expect(
      matchShortcut({ ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, key: "k" }, "Ctrl+K"),
    ).toBe(false);
  });
});
