import { describe, expect, it } from "vitest";
import { getNavigationTargets } from "./nodeNavigation.js";

// rows 必须按 sort 顺序给出（与 notesData 一致）
function buildMap(rows) {
  const map = new Map();
  rows.forEach((r) => map.set(r.id, { ...r, children: [] }));
  rows.forEach((r) => {
    if (r.top && r.top !== "0") map.get(r.top)?.children.push(map.get(r.id));
  });
  return map;
}

const rows = [
  { id: "R", name: "root", top: "0" },
  { id: "A", name: "A", top: "R" },
  { id: "B", name: "B", top: "R" },
  { id: "C", name: "C", top: "R" },
  { id: "A1", name: "A1", top: "A" },
  { id: "A2", name: "A2", top: "A" },
  { id: "A3", name: "A3", top: "A" },
  { id: "A4", name: "A4", top: "A" },
];
const map = buildMap(rows);
const base = { nodeMap: map, displayRootId: "R" };

describe("getNavigationTargets", () => {
  it("returns all null for an unknown selection", () => {
    expect(getNavigationTargets({ ...base, selectedId: "missing" }))
      .toEqual({ up: null, left: null, right: null, down: null });
  });

  it("selects the parent", () => {
    expect(getNavigationTargets({ ...base, selectedId: "A" }).up).toBe("R");
  });

  it("selects previous/next siblings by order", () => {
    const b = getNavigationTargets({ ...base, selectedId: "B" });
    expect(b.left).toBe("A");
    expect(b.right).toBe("C");
  });

  it("stops at sibling boundaries", () => {
    const a = getNavigationTargets({ ...base, selectedId: "A" });
    expect(a.left).toBe(null);
    expect(a.right).toBe("B");
    const c = getNavigationTargets({ ...base, selectedId: "C" });
    expect(c.left).toBe("B");
    expect(c.right).toBe(null);
  });

  it("root has no parent or siblings", () => {
    const r = getNavigationTargets({ ...base, selectedId: "R" });
    expect(r.up).toBe(null);
    expect(r.left).toBe(null);
    expect(r.right).toBe(null);
  });

  it("picks the child whose center is closest to the parent", () => {
    const centers = { R: 0, A: 100, A1: 10, A2: 20, A3: 100, A4: 200 };
    expect(getNavigationTargets({
      ...base,
      selectedId: "A",
      getCenterX: (id) => centers[id] ?? null,
    }).down).toBe("A3");
  });

  it("falls back to the middle child when centers are unavailable", () => {
    // 数量中间：floor((4-1)/2) = 1 → A2
    expect(getNavigationTargets({ ...base, selectedId: "A" }).down).toBe("A2");
  });

  it("returns null down when the node has no children", () => {
    expect(getNavigationTargets({ ...base, selectedId: "A1" }).down).toBe(null);
  });

  it("respects the focus subtree", () => {
    const focused = getNavigationTargets({ nodeMap: map, displayRootId: "A", selectedId: "A" });
    expect(focused.up).toBe(null);
    expect(focused.left).toBe(null);
    expect(focused.right).toBe(null);
    expect(focused.down).toBe("A2");

    const child = getNavigationTargets({ nodeMap: map, displayRootId: "A", selectedId: "A2" });
    expect(child.up).toBe("A");
    expect(child.left).toBe("A1");
    expect(child.right).toBe("A3");
  });

  it("returns all null when displayRootId is missing", () => {
    expect(getNavigationTargets({ nodeMap: map, displayRootId: null, selectedId: "A" }))
      .toEqual({ up: null, left: null, right: null, down: null });
  });
});
