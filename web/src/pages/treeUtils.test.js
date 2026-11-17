import { describe, expect, it } from "vitest";
import { computeAncestorChain, collectExpandedChildren, needsSortBump, canSwapNodes, applySwapSorts, filterSiblingsByName } from "./treeUtils.js";

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

describe("needsSortBump", () => {
  it("bumps when current sort is not greater than sibling max", () => {
    expect(needsSortBump(0, 0)).toBe(true);
    expect(needsSortBump(3, 3)).toBe(true);
    expect(needsSortBump(2, 5)).toBe(true);
  });

  it("keeps when current sort is greater than sibling max", () => {
    expect(needsSortBump(5, 3)).toBe(false);
    expect(needsSortBump(1, 0)).toBe(false);
  });

  it("treats missing values as 0", () => {
    expect(needsSortBump(undefined, undefined)).toBe(true);
    expect(needsSortBump("", "")).toBe(true);
  });
});

describe("canSwapNodes", () => {
  it("allows siblings under the same non-root parent", () => {
    expect(canSwapNodes({ id: "a", top: "p" }, { id: "b", top: "p" })).toBe(true);
  });

  it("rejects nodes under different parents", () => {
    expect(canSwapNodes({ id: "a", top: "p" }, { id: "b", top: "q" })).toBe(false);
  });

  it("rejects the same node", () => {
    expect(canSwapNodes({ id: "a", top: "p" }, { id: "a", top: "p" })).toBe(false);
  });

  it("rejects root-level nodes", () => {
    expect(canSwapNodes({ id: "a", top: "0" }, { id: "b", top: "0" })).toBe(false);
  });

  it("rejects missing nodes or parents", () => {
    expect(canSwapNodes(null, { id: "b", top: "p" })).toBe(false);
    expect(canSwapNodes({ id: "a" }, { id: "b" })).toBe(false);
  });
});

describe("applySwapSorts", () => {
  const notes = () => [
    { id: "a", sort: 1 },
    { id: "b", sort: 5 },
    { id: "c", sort: 3 },
  ];

  it("swaps the sort values and re-sorts", () => {
    const next = applySwapSorts(notes(), { id: "a", sort: 1 }, { id: "b", sort: 5 });
    expect(next.map((n) => n.id)).toEqual(["b", "c", "a"]);
    expect(next.map((n) => n.sort)).toEqual([1, 3, 5]);
  });

  it("keeps stable order when both sorts are equal", () => {
    const list = [
      { id: "a", sort: 0 },
      { id: "b", sort: 0 },
      { id: "c", sort: 2 },
    ];
    const next = applySwapSorts(list, { id: "a", sort: 0 }, { id: "b", sort: 0 });
    expect(next.map((n) => n.id)).toEqual(["a", "b", "c"]);
  });

  it("returns the input unchanged when arguments are missing", () => {
    const list = notes();
    expect(applySwapSorts(list, null, { id: "b", sort: 5 })).toBe(list);
    expect(applySwapSorts(null, { id: "a" }, { id: "b" })).toBeNull();
  });
});

describe("filterSiblingsByName", () => {
  const list = [
    { id: "a", name: "Alpha" },
    { id: "b", name: "beta" },
    { id: "c", name: "Gamma" },
  ];

  it("returns all siblings for an empty keyword", () => {
    expect(filterSiblingsByName(list, "")).toBe(list);
    expect(filterSiblingsByName(list, "   ")).toBe(list);
    expect(filterSiblingsByName(list, undefined)).toBe(list);
  });

  it("filters case-insensitively by name substring", () => {
    expect(filterSiblingsByName(list, "ALP").map((s) => s.id)).toEqual(["a"]);
    expect(filterSiblingsByName(list, "a").map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterSiblingsByName(list, "zzz")).toEqual([]);
  });
});
