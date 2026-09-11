import { describe, expect, it } from "vitest";

import { resolveRenderedCodeLanguage } from "./enhancedCodeBlock";

describe("resolveRenderedCodeLanguage", () => {
  it("routes mermaid and math to rendered views", () => {
    expect(resolveRenderedCodeLanguage("mermaid")).toBe("mermaid");
    expect(resolveRenderedCodeLanguage("math")).toBe("math");
  });

  it("leaves every other language on the default code-block path", () => {
    expect(resolveRenderedCodeLanguage("typescript")).toBeNull();
    expect(resolveRenderedCodeLanguage("")).toBeNull();
    expect(resolveRenderedCodeLanguage(undefined)).toBeNull();
  });
});
