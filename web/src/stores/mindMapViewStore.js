import { create } from 'zustand';

export const useMindMapViewStore = create((set) => ({
  focusNodeId: '1',
  loadedNodeIds: new Set(),
  expandedNodeIds: new Set(),
  initializedFocusId: null,

  setFocusNodeId: (id) => set({ focusNodeId: id }),

  setLoadedNodeIds: (updater) =>
    set((s) => ({
      loadedNodeIds: typeof updater === 'function' ? updater(s.loadedNodeIds) : updater,
    })),

  setExpandedNodeIds: (updater) =>
    set((s) => ({
      expandedNodeIds: typeof updater === 'function' ? updater(s.expandedNodeIds) : updater,
    })),

  setInitializedFocusId: (id) => set({ initializedFocusId: id }),
}));
