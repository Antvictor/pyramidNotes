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

  // 揭示新建节点：叶子只加载（不展开，避免空节点显示折叠按钮），祖先链加载+展开
  revealNodeIds: (leafId, ancestors) =>
    set((s) => {
      const loadedNodeIds = new Set(s.loadedNodeIds);
      const expandedNodeIds = new Set(s.expandedNodeIds);
      loadedNodeIds.add(leafId);
      for (const id of ancestors) {
        loadedNodeIds.add(id);
        expandedNodeIds.add(id);
      }
      return { loadedNodeIds, expandedNodeIds };
    }),
}));
