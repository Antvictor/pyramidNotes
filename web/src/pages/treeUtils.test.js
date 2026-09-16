import { describe, expect, it } from "vitest";
import { computeAncestorChain, collectExpandedChildren } from "./treeUtils.js";

function map(nodes) {
  const m = new Map();
  for (const n of nodes) m.set(n.id, n);
  return m;
}

describe("computeAncestorChain", () => {
  const nodeMap = map([
    { id: "1", top: "0" },
    { id: "2", top: "1" },
    { id: "3", top: "2" },
    { id: "4", top: "3" },
  ]);

  it("walks from node up to display root", () => {
    expect(computeAncestorChain("4", "1", nodeMap)).toEqual(["4", "3", "2", "1"]);
  });

  it("stops at focus root when not global", () => {
    expect(computeAncestorChain("4", "2", nodeMap)).toEqual(["4", "3", "2"]);
  });

  it("returns only the node when node is the root", () => {
    expect(computeAncestorChain("2", "2", nodeMap)).toEqual(["2"]);
  });

  it("stops at top=0 when display root missing", () => {
    expect(computeAncestorChain("3", "999", nodeMap)).toEqual(["3", "2", "1"]);
  });
});

describe("collectExpandedChildren", () => {
  const nodeMap = map([
    { id: "1", top: "0", children: [{ id: "2" }, { id: "3" }] },
    { id: "2", top: "1", children: [{ id: "4" }] },
    { id: "3", top: "1", children: [] },
    { id: "4", top: "2", children: [] },
  ]);

  it("returns direct children of expanded nodes", () => {
    expect([...collectExpandedChildren(new Set(["1"]), nodeMap)].sort()).toEqual(["2", "3"]);
  });

  it("merges and de-duplicates across multiple expanded nodes", () => {
    expect([...collectExpandedChildren(new Set(["1", "2"]), nodeMap)].sort()).toEqual(["2", "3", "4"]);
  });

  it("ignores unknown ids", () => {
    expect([...collectExpandedChildren(new Set(["nope"]), nodeMap)]).toEqual([]);
  });

  it("returns empty set for empty expanded set", () => {
    expect(collectExpandedChildren(new Set(), nodeMap).size).toBe(0);
  });

  it("handles nodes without a children array", () => {
    const m = map([{ id: "x", top: "0" }]);
    expect(collectExpandedChildren(new Set(["x"]), m).size).toBe(0);
  });
});
