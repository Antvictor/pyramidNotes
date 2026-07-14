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
  it("round trips stable ids while keeping the node name as the visible alias", () => {
    const reference = { id: "second-id", name: "Same name" };

    expect(serializeInternalNodeReference(reference)).toBe("[[second-id|Same name]]");
    expect(serializeInternalNodeReference(reference, true)).toBe("![[second-id|Same name]]");
    expect(parseInternalNodeReference("second-id|Same name")).toEqual(reference);
  });

  it("resolves duplicate names by id", () => {
    const target = resolveInternalNodeTarget(duplicateNodes, {
      id: "second-id",
      name: "Same name",
    });

    expect(target?.content).toBe("second");
  });

  it("keeps legacy name-only references working", () => {
    expect(parseInternalNodeReference("Same name")).toEqual({ id: "", name: "Same name" });
    expect(resolveInternalNodeTarget(
      [{ id: "only-id", name: "Unique name" }],
      { id: "", name: "Unique name" },
    )?.id).toBe("only-id");
  });

  it("does not guess which duplicate node a legacy name-only reference meant", () => {
    expect(resolveInternalNodeTarget(duplicateNodes, {
      id: "",
      name: "Same name",
    })).toBeUndefined();
  });

  it("does not redirect a missing id to another node with the same name", () => {
    expect(resolveInternalNodeTarget(duplicateNodes, {
      id: "deleted-id",
      name: "Same name",
    })).toBeUndefined();
  });
});
