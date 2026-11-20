import { describe, expect, it } from "vitest";
import { getActiveEdgeIds } from "./mindMapEdges.js";

function buildMap(rows) {
  const map = new Map();
  rows.forEach((r) => map.set(r.id, { ...r }));
  return map;
}

const rows = [
  { id: "R", top: "0" },
  { id: "A", top: "R" },
  { id: "B", top: "R" },
  { id: "A1", top: "A" },
  { id: "A2", top: "A" },
  { id: "A21", top: "A2" },
];
const nodeMap = buildMap(rows);

describe("getActiveEdgeIds", () => {
  it("includes the ancestor chain from root to the selection", () => {
    const ids = getActiveEdgeIds({ selectedId: "A21", nodeMap });
    expect(ids.has("eA2-A21")).toBe(true);
    expect(ids.has("eA-A2")).toBe(true);
    expect(ids.has("eR-A")).toBe(true);
    expect(ids.has("eR-B")).toBe(false);
  });

  it("does not activate edges from the selection down to its children", () => {
    const ids = getActiveEdgeIds({ selectedId: "A", nodeMap });
    expect(ids.has("eA-A1")).toBe(false);
    expect(ids.has("eA-A2")).toBe(false);
    expect([...ids]).toEqual(["eR-A"]);
  });

  it("never activates sibling-chain edges", () => {
    const withLeft = [
      { id: "R", top: "0" },
      { id: "A", top: "R", left: "0" },
      { id: "B", top: "R", left: "A" },
    ];
    const ids = getActiveEdgeIds({ selectedId: "B", nodeMap: buildMap(withLeft) });
    expect(ids.has("eA-B")).toBe(false);
    expect([...ids]).toEqual(["eR-B"]);
  });

  it("returns an empty set for no selection or an unknown id", () => {
    expect(getActiveEdgeIds({ selectedId: null, nodeMap }).size).toBe(0);
    expect(getActiveEdgeIds({ selectedId: "missing", nodeMap }).size).toBe(0);
  });

  it("activates nothing when the root is selected", () => {
    expect(getActiveEdgeIds({ selectedId: "R", nodeMap }).size).toBe(0);
  });

  it("terminates on a parent cycle", () => {
    const cyclic = buildMap([
      { id: "X", top: "Y" },
      { id: "Y", top: "X" },
    ]);
    const ids = getActiveEdgeIds({ selectedId: "X", nodeMap: cyclic });
    expect(ids.has("eY-X")).toBe(true);
    expect(ids.has("eX-Y")).toBe(true);
    expect(ids.size).toBe(2);
  });
});
