import { describe, expect, it, beforeEach } from "vitest";
import { useMindMapViewStore } from "./mindMapViewStore.js";

function resetStore() {
  useMindMapViewStore.setState({
    focusNodeId: "1",
    loadedNodeIds: new Set(),
    expandedNodeIds: new Set(),
    initializedFocusId: null,
  });
}

describe("mindMapViewStore", () => {
  beforeEach(resetStore);

  it("setLoadedNodeIds accepts a functional updater", () => {
    useMindMapViewStore.getState().setLoadedNodeIds((prev) => new Set([...prev, "a"]));
    expect([...useMindMapViewStore.getState().loadedNodeIds]).toEqual(["a"]);
  });

  it("setLoadedNodeIds accepts a plain Set value", () => {
    useMindMapViewStore.getState().setLoadedNodeIds(new Set(["x", "y"]));
    expect([...useMindMapViewStore.getState().loadedNodeIds]).toEqual(["x", "y"]);
  });

  it("setExpandedNodeIds accepts a functional updater", () => {
    useMindMapViewStore.getState().setExpandedNodeIds((prev) => new Set([...prev, "n1"]));
    expect([...useMindMapViewStore.getState().expandedNodeIds]).toEqual(["n1"]);
  });

  it("setFocusNodeId updates focusNodeId", () => {
    useMindMapViewStore.getState().setFocusNodeId("42");
    expect(useMindMapViewStore.getState().focusNodeId).toBe("42");
  });

  it("revealNodeIds loads leaf and expands ancestors only", () => {
    useMindMapViewStore.getState().setLoadedNodeIds(new Set(["a"]));
    useMindMapViewStore.getState().revealNodeIds("leaf", ["p1", "root"]);
    const state = useMindMapViewStore.getState();
    expect([...state.loadedNodeIds]).toEqual(["a", "leaf", "p1", "root"]);
    expect([...state.expandedNodeIds]).toEqual(["p1", "root"]);
  });
});
