export type NodeReferenceTarget = {
  id: string;
  name: string;
  content?: string;
};

export type InternalNodeReference = {
  id: string;
  name: string;
};

export function parseInternalNodeReference(value: string): InternalNodeReference {
  const separatorIndex = value.indexOf("|");
  if (separatorIndex < 0) {
    return { id: "", name: value.trim() };
  }

  return {
    id: value.slice(0, separatorIndex).trim(),
    name: value.slice(separatorIndex + 1).trim(),
  };
}

export function serializeInternalNodeReference(
  reference: InternalNodeReference,
  embed = false,
) {
  const value = reference.id
    ? `${reference.id}|${reference.name}`
    : reference.name;
  return `${embed ? "!" : ""}[[${value}]]`;
}

export function resolveInternalNodeTarget(
  nodes: NodeReferenceTarget[],
  reference: InternalNodeReference,
) {
  if (reference.id) {
    return nodes.find((node) => node.id === reference.id);
  }

  const nameMatches = nodes.filter((node) => node.name === reference.name);
  return nameMatches.length === 1 ? nameMatches[0] : undefined;
}
