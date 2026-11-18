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

// 创建缺失引用时使用的名称：别名优先，其次 id
export function referenceCreateName(reference: InternalNodeReference) {
  const name = String(reference.name || "").trim();
  return name || String(reference.id || "").trim();
}

// Ctrl（Windows/Linux）或 ⌘（macOS）
export function isReferenceCreateModifier(
  event: { ctrlKey?: boolean; metaKey?: boolean } | null | undefined,
) {
  return Boolean(event && (event.ctrlKey || event.metaKey));
}

// 创建成功后写入节点属性的引用：优先使用实际节点名，否则保留原标题
export function buildCreatedReference(
  created: { id?: string; name?: string } | undefined,
  fallbackName: string,
): InternalNodeReference {
  return {
    id: created?.id || "",
    name: created?.name || fallbackName,
  };
}
