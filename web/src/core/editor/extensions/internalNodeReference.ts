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
    const id = value.trim();
    return { id, name: id };
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
  const hasExplicitAlias =
    Boolean(reference.id) && Boolean(reference.name) && reference.name !== reference.id;
  const value = hasExplicitAlias
    ? `${reference.id}|${reference.name}`
    : reference.id || reference.name;
  return `${embed ? "!" : ""}[[${value}]]`;
}

export function resolveInternalNodeTarget(
  nodes: NodeReferenceTarget[],
  reference: InternalNodeReference,
) {
  if (!reference.id) return undefined;
  return nodes.find((node) => node.id === reference.id);
}
