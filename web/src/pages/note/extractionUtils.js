export function sanitizeNodeName(rawName) {
  return rawName.trim().replace(/\//g, "-");
}

export function buildChildNodeRecord({
  parentId,
  nodeName,
  content,
  createId,
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
  };
  const yamlStr = { id: childId, alias: "", title: safeName, left: "", top: parentId };

  return { safeName, childId, newNode, yamlStr };
}
