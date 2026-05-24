import { createContext, useContext, useState, useCallback } from 'react';

const SelectedNodeContext = createContext({
  selectedNode: null,
  setSelectedNode: () => {},
  clearSelectedNode: () => {},
  shortcuts: null,
});

export function SelectedNodeProvider({ children, shortcuts, selectedNode, setSelectedNode, clearSelectedNode }) {
  const value = {
    selectedNode,
    setSelectedNode,
    clearSelectedNode,
    shortcuts,
  };

  return (
    <SelectedNodeContext.Provider value={value}>
      {children}
    </SelectedNodeContext.Provider>
  );
}

export function useSelectedNode() {
  return useContext(SelectedNodeContext);
}

export default SelectedNodeContext;