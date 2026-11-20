import { describe, expect, it, vi } from "vitest";
import {
  EDITOR_ENTER_MS,
  EDITOR_EXIT_MS,
  MAP_EXIT_MS,
  prefersReducedMotion,
  resolveEntryCamera,
} from "./routeTransition.js";

describe("resolveEntryCamera", () => {
  it("restores the viewport when nothing is selected", () => {
    expect(resolveEntryCamera({ hasSelection: false, isVisible: false })).toBe("restore");
  });

  it("keeps the viewport when the selected node is visible", () => {
    expect(resolveEntryCamera({ hasSelection: true, isVisible: true })).toBe("none");
  });

  it("centers when the selected node is offscreen", () => {
    expect(resolveEntryCamera({ hasSelection: true, isVisible: false })).toBe("center");
  });
});

describe("prefersReducedMotion", () => {
  it("reflects the media query", () => {
    const original = window.matchMedia;
    try {
      window.matchMedia = vi.fn(() => ({ matches: true }));
      expect(prefersReducedMotion()).toBe(true);
      window.matchMedia = vi.fn(() => ({ matches: false }));
      expect(prefersReducedMotion()).toBe(false);
    } finally {
      window.matchMedia = original;
    }
  });
});

describe("durations", () => {
  it("keeps the map/editor timings used by the CSS classes", () => {
    expect(MAP_EXIT_MS).toBe(160);
    expect(EDITOR_ENTER_MS).toBe(280);
    expect(EDITOR_EXIT_MS).toBe(180);
  });
});
