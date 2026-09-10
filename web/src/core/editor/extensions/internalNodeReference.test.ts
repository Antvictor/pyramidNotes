import { describe, expect, it } from "vitest";

import {
  parseInternalNodeReference,
  resolveInternalNodeTarget,
  serializeInternalNodeReference,
} from "./internalNodeReference";

const duplicateNodes = [
  { id: "first-id", name: "Same name", content: "first" },
  { id: "second-id", name: "Same name", content: "second" },
];

describe("internal node references", () => {
  it("round trips explicit-alias references", () => {
    const reference = { id: "second-id", name: "Alias" };

    expect(serializeInternalNodeReference(reference)).toBe("[[second-id|Alias]]");
    expect(serializeInternalNodeReference(reference, true)).toBe("![[second-id|Alias]]");
    expect(parseInternalNodeReference("second-id|Alias")).toEqual(reference);
  });

  it("parses pipe-less references as id-only and round trips without a pipe", () => {
    expect(parseInternalNodeReference("second-id")).toEqual({
      id: "second-id",
      name: "second-id",
    });
    const reference = parseInternalNodeReference("second-id");
    expect(serializeInternalNodeReference(reference)).toBe("[[second-id]]");
    expect(serializeInternalNodeReference(reference, true)).toBe("![[second-id]]");
  });

  it("serializes empty-name references as id-only", () => {
    expect(serializeInternalNodeReference({ id: "second-id", name: "" })).toBe("[[second-id]]");
    expect(serializeInternalNodeReference({ id: "second-id", name: "" }, true)).toBe("![[second-id]]");
  });

  it("serializes a name equal to the id as id-only", () => {
    expect(serializeInternalNodeReference({ id: "second-id", name: "second-id" })).toBe("[[second-id]]");
  });

  it("resolves duplicate names by id", () => {
    const target = resolveInternalNodeTarget(duplicateNodes, {
      id: "second-id",
      name: "Same name",
    });

    expect(target?.content).toBe("second");
  });

  it("does not resolve references without an id", () => {
    expect(resolveInternalNodeTarget(
      [{ id: "only-id", name: "Unique name" }],
      { id: "", name: "Unique name" },
    )).toBeUndefined();
  });

  it("does not redirect a missing id to another node with the same name", () => {
    expect(resolveInternalNodeTarget(duplicateNodes, {
      id: "deleted-id",
      name: "Same name",
    })).toBeUndefined();
  });
});
