export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];

const IMAGE_EXT_PATTERN = /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i;
const ATTACHMENT_NAME_PATTERN = /^[\w一-鿿-]+-\d{3}\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i;
const ABSOLUTE_PATH_PATTERN = /^(\/|~\/|[A-Za-z]:\\)/;

export function sanitizeFileName(name: string): string {
  return String(name)
    .replace(/[^a-zA-Z0-9一-鿿_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'untitled';
}

export function isImageReference(name: string): boolean {
  if (!name) return false;
  // Don't match absolute paths (they need to be imported first)
  if (ABSOLUTE_PATH_PATTERN.test(name)) return false;
  // Check if it has a known image extension
  if (IMAGE_EXT_PATTERN.test(name)) return true;
  // Check if it looks like an attachment filename (name-001.png)
  if (ATTACHMENT_NAME_PATTERN.test(name)) return true;
  return false;
}
