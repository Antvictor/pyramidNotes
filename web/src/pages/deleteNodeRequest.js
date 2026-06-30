export function buildDeleteRequest({
  nodeId,
  nodeName,
  childCount,
  grandParentId,
  isRoot,
}) {
  return {
    id: nodeId,
    name: nodeName,
    childCount,
    grandParentId,
    isRoot,
    requiresChoice: childCount > 0,
  };
}

export function buildDeleteConfirmation({ nodeName, mode }) {
  return {
    translationKey:
      mode === "entire-tree"
        ? "dialogs.deleteNode.confirmSubtree"
        : "dialogs.deleteNode.confirmParentOnly",
    values: { nodeName },
  };
}
