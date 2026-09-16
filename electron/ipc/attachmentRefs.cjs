// 附件图片的引用解析（纯逻辑，无 electron 依赖，可单测）

// ⚠️ ![[...]] 同时用于「图片」和「节点嵌入」
// （web/src/core/editor/extensions/InternalNodeLink.tsx:117-127，用 isImageReference 区分）。
// 因此必须按图片扩展名过滤，否则会把节点嵌入也收进引用集合。
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];
const IMAGE_REF_RE = /!\[\[([^\]\n]+)\]\]/g;
const IMAGE_EXT_RE = new RegExp(`\\.(${IMAGE_EXTENSIONS.join('|')})$`, 'i');

// 从一篇笔记的内容里提取它引用的本地图片文件名
function extractImageRefs(content) {
  const refs = new Set();
  if (!content) return refs;
  IMAGE_REF_RE.lastIndex = 0;
  let m;
  while ((m = IMAGE_REF_RE.exec(content)) !== null) {
    const name = m[1].trim();
    if (IMAGE_EXT_RE.test(name)) refs.add(name);
  }
  return refs;
}

// 目录里未被任何引用命中的文件
function pickUnreferenced(dirFiles, referenced) {
  return dirFiles.filter((f) => !referenced.has(f));
}

module.exports = { IMAGE_EXTENSIONS, IMAGE_REF_RE, IMAGE_EXT_RE, extractImageRefs, pickUnreferenced };
