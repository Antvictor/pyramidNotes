const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { resolveAttachmentDir } = require('../common/utils/fileHelper');

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'];

const MIME_MAP = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
};

function sanitizeFileName(name) {
  return String(name)
    .replace(/[^a-zA-Z0-9一-鿿_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'untitled';
}

function getCounterPattern(safeName) {
  return new RegExp(`^${safeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)\\.(${IMAGE_EXTENSIONS.join('|')})$`, 'i');
}

function getNextCounter(safeName, attachmentDir) {
  let maxCounter = 0;
  const pattern = getCounterPattern(safeName);
  try {
    const files = fs.readdirSync(attachmentDir);
    for (const file of files) {
      const match = pattern.exec(file);
      if (match) {
        const counter = parseInt(match[1], 10);
        if (counter > maxCounter) maxCounter = counter;
      }
    }
  } catch {
    // directory doesn't exist yet, counter stays 0
  }
  return maxCounter + 1;
}

function registerAttachmentIPC() {
  ipcMain.handle('saveAttachmentFromBase64', async (_event, base64Data, noteName, extension) => {
    try {
      const attachmentDir = resolveAttachmentDir();
      if (!fs.existsSync(attachmentDir)) {
        fs.mkdirSync(attachmentDir, { recursive: true });
      }
      const safeName = sanitizeFileName(noteName);
      const ext = (extension || 'png').toLowerCase();
      const counter = getNextCounter(safeName, attachmentDir);
      const fileName = `${safeName}-${String(counter).padStart(3, '0')}.${ext}`;
      const filePath = path.join(attachmentDir, fileName);

      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(filePath, buffer);

      return { fileName };
    } catch (error) {
      console.error('saveAttachmentFromBase64 error:', error);
      return { error: error.message };
    }
  });

  ipcMain.handle('saveAttachmentFromPath', async (_event, sourcePath, noteName) => {
    try {
      const attachmentDir = resolveAttachmentDir();
      if (!fs.existsSync(attachmentDir)) {
        fs.mkdirSync(attachmentDir, { recursive: true });
      }
      const safeName = sanitizeFileName(noteName);
      const ext = path.extname(sourcePath).replace('.', '').toLowerCase() || 'png';
      const counter = getNextCounter(safeName, attachmentDir);
      const fileName = `${safeName}-${String(counter).padStart(3, '0')}.${ext}`;
      const filePath = path.join(attachmentDir, fileName);

      fs.copyFileSync(sourcePath, filePath);

      return { fileName };
    } catch (error) {
      console.error('saveAttachmentFromPath error:', error);
      return { error: error.message };
    }
  });

  ipcMain.handle('readAttachment', async (_event, fileName) => {
    try {
      const attachmentDir = resolveAttachmentDir();
      const filePath = path.resolve(attachmentDir, fileName);
      if (!filePath.startsWith(attachmentDir + path.sep)) {
        return { error: 'Invalid file name' };
      }
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(fileName).replace('.', '').toLowerCase();
      const mimeType = MIME_MAP[ext] || 'application/octet-stream';
      return { base64: buffer.toString('base64'), mimeType };
    } catch (error) {
      console.error('readAttachment error:', error);
      return { error: error.message };
    }
  });
}

module.exports = { registerAttachmentIPC };
