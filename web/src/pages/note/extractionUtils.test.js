import { describe, expect, it, vi } from "vitest";
import { buildChildNodeRecord, sanitizeNodeName } from "./extractionUtils";

describe("extractionUtils", () => {
  it("sanitizes node names for child creation", () => {
    expect(sanitizeNodeName("  a/b/c  ")).toBe("a-b-c");
  });

  it("builds child node records with parent linkage and keeps the requested name", () => {
    const record = buildChildNodeRecord({
      parentId: "parent-1",
      nodeName: "alpha",
      content: "hello",
      createId: vi.fn().mockReturnValue("child-1"),
    });

    expect(record).toEqual({
      safeName: "alpha",
      childId: "child-1",
      newNode: {
        id: "child-1",
        name: "alpha",
        content: "hello",
        alias: "",
        top: "parent-1",
        left: "",
      },
      yamlStr: {
        id: "child-1",
        alias: "",
        title: "alpha",
        left: "",
        top: "parent-1",
      },
    });
  });
});
