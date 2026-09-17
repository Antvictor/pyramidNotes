/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo } from 'react';

const SelectedNodeContext = createContext({
  selectedNode: null,
  setSelectedNode: () => {},
  clearSelectedNode: () => {},
  shortcuts: null,
});

export function SelectedNodeProvider({ children, shortcuts, selectedNode, setSelectedNode, clearSelectedNode }) {
  // 每次渲染都新建 value 会让所有订阅者（每个脑图节点）无谓重渲染
  const value = useMemo(
    () => ({ selectedNode, setSelectedNode, clearSelectedNode, shortcuts }),
    [selectedNode, setSelectedNode, clearSelectedNode, shortcuts],
  );

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
