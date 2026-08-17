import { describe, expect, it } from "vitest";
import { computeAncestorChain } from "./treeUtils.js";

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
