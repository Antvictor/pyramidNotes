export function sanitizeNodeName(rawName) {
  return rawName.trim().replace(/\//g, "-");
}

export function buildChildNodeRecord({
  parentId,
  nodeName,
  content,
  createId,
  sort,
}) {
  const safeName = sanitizeNodeName(nodeName);
  const childId = createId();
  const newNode = {
    id: childId,
    name: safeName,
    content,
    alias: "",
    top: parentId,
    left: "",
    sort,
  };
  const yamlStr = { id: childId, alias: "", title: safeName, left: "", top: parentId, sort };

  return { safeName, childId, newNode, yamlStr };
}
