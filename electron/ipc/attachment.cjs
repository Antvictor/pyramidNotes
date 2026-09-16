const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { resolveStoragePath, resolveAttachmentDir } = require('../common/utils/fileHelper');
const { getDb } = require('../db/db.cjs');
const { extractImageRefs, pickUnreferenced } = require('./attachmentRefs.cjs');

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

// 删除 attachment/img 下没有任何笔记引用的文件。
// 引用来源 = 全部 notes.content（含 delete=1 的回收站条目），
// 因此回收站中的笔记仍"占住"它的图片，恢复后不会缺图。
// 只应在「应用启动」与「永久删除之后」调用 —— 保存时调用会因撤销丢图。
function sweepUnreferencedAttachments() {
  try {
    const db = getDb();
    // 用 resolveStoragePath() 拼路径而不是 resolveAttachmentDir() —— 后者会 mkdir，
    // 会让从没用过图片的用户每次启动都多出一个空目录
    const attachmentDir = path.join(resolveStoragePath(), 'attachment', 'img');
    if (!fs.existsSync(attachmentDir)) return { removed: 0 };

    const referenced = new Set();
    for (const row of db.prepare('SELECT content FROM notes').all()) {
      for (const ref of extractImageRefs(row.content)) referenced.add(ref);
    }

    let removed = 0;
    for (const file of pickUnreferenced(fs.readdirSync(attachmentDir), referenced)) {
      const p = path.resolve(attachmentDir, file);
      if (!p.startsWith(attachmentDir + path.sep)) continue; // 路径穿越校验
      try {
        if (fs.statSync(p).isFile()) {
          fs.unlinkSync(p);
          removed += 1;
        }
      } catch {
        // 已不存在或不可读，跳过
      }
    }
    return { removed };
  } catch (error) {
    console.error('sweepUnreferencedAttachments error:', error);
    return { removed: 0, error: error.message };
  }
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

  // 手动触发扫除（供未来前端/调试使用）
  ipcMain.handle('sweepAttachments', () => sweepUnreferencedAttachments());
}

module.exports = { registerAttachmentIPC, sweepUnreferencedAttachments };
