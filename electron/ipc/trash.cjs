const { ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../db/db.cjs');
const { resolveStoragePath, classifyError } = require('../common/utils/fileHelper.js');
const { getCachedSettings, DEFAULT_SETTINGS } = require('../common/settings.cjs');
const {
  filterDeletableIds, collectCluster, listTrashBoundaries, isExpired,
} = require('./trashUtils.cjs');
const { sweepUnreferencedAttachments } = require('./attachment.cjs');

function getTrashDir() {
  const dir = path.join(resolveStoragePath(), '.delete');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const fileNameOf = (row) => `${row.id}-${row.name}.md`;

function loadRowsById(ids) {
  const db = getDb();
  const map = new Map();
  for (const id of ids) {
    const row = db.prepare('SELECT id, name, top FROM notes WHERE id = ?').get(id);
    if (row) map.set(id, row);
  }
  return map;
}

async function deleteNotes(nodeIds) {
  try {
    const db = getDb();
    const settings = getCachedSettings() || DEFAULT_SETTINGS;
    const mode = settings.deleteMode || 'trash';
    const storagePath = resolveStoragePath();
    const rowsById = loadRowsById(nodeIds);
    const deletable = filterDeletableIds(nodeIds, rowsById); // 根永不删/进回收站
    const now = new Date().toISOString();

    // 文件操作先做（systemTrash 为异步），DB 写合并为单个事务：
    // 减少主进程阻塞时间与 WAL 抖动
    const softIds = [];
    const hardIds = [];
    const trashDir = mode === 'trash' ? getTrashDir() : null;

    for (const id of deletable) {
      const row = rowsById.get(id);
      const src = path.join(storagePath, fileNameOf(row));
      if (mode === 'trash') {
        const dest = path.join(trashDir, fileNameOf(row));
        if (fs.existsSync(src)) fs.renameSync(src, dest);
        softIds.push(id);
      } else if (mode === 'systemTrash') {
        if (fs.existsSync(src)) await shell.trashItem(src);
        hardIds.push(id);
      } else { // permanent
        if (fs.existsSync(src)) fs.unlinkSync(src);
        hardIds.push(id);
      }
    }

    const softStmt = db.prepare('UPDATE notes SET "delete" = 1, last_up_time = ? WHERE id = ?');
    const hardStmt = db.prepare('DELETE FROM notes WHERE id = ?');
    db.transaction(() => {
      for (const id of softIds) softStmt.run(now, id);
      for (const id of hardIds) hardStmt.run(id);
    })();

    // trash 模式下文件仍在回收站（可恢复），不扫除
    if (mode !== 'trash') sweepUnreferencedAttachments();

    return { ok: true, mode, count: deletable.length };
  } catch (error) {
    console.error('deleteNotes error:', error);
    return { error: classifyError(error), originalError: error.message };
  }
}

function listTrash() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT id, name, top, "delete", last_up_time FROM notes').all();
    return listTrashBoundaries(rows)
      .map((r) => ({ id: r.id, name: r.name, last_up_time: r.last_up_time }))
      .sort((a, b) => String(b.last_up_time).localeCompare(String(a.last_up_time)));
  } catch (error) {
    console.error('listTrash error:', error);
    return [];
  }
}

function restoreTrash(nodeId) {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT id, name, top, "delete" FROM notes').all();
    const byId = new Map(rows.map((r) => [r.id, r]));
    const clusterIds = collectCluster(nodeId, rows);
    const storagePath = resolveStoragePath();
    const trashDir = getTrashDir();
    const now = new Date().toISOString();
    const idsToRestore = [];
    for (const id of clusterIds) {
      const r = byId.get(id);
      if (!r) continue;
      const src = path.join(trashDir, fileNameOf(r));
      const dest = path.join(storagePath, fileNameOf(r));
      if (fs.existsSync(src)) fs.renameSync(src, dest);
      idsToRestore.push(id);
    }
    const stmt = db.prepare('UPDATE notes SET "delete" = 0, last_up_time = ? WHERE id = ?');
    db.transaction(() => {
      for (const id of idsToRestore) stmt.run(now, id);
    })();
    return { ok: true, restored: clusterIds };
  } catch (error) {
    console.error('restoreTrash error:', error);
    return { error: classifyError(error), originalError: error.message };
  }
}

function purgeExpiredTrash() {
  try {
    const db = getDb();
    const settings = getCachedSettings() || DEFAULT_SETTINGS;
    const days = Number(settings.trashRetentionDays);
    if (!days || days <= 0) return { purged: 0 };
    const rows = db.prepare('SELECT id, name, last_up_time FROM notes WHERE "delete" = 1').all();
    const nowMs = Date.now();
    const trashDir = getTrashDir();
    let purged = 0;
    for (const r of rows) {
      if (!isExpired(r.last_up_time, days, nowMs)) continue;
      const p = path.join(trashDir, fileNameOf(r));
      if (fs.existsSync(p)) fs.unlinkSync(p);
      db.prepare('DELETE FROM notes WHERE id = ?').run(r.id);
      purged += 1;
    }

    if (purged > 0) sweepUnreferencedAttachments();

    return { purged };
  } catch (error) {
    console.error('purgeExpiredTrash error:', error);
    return { purged: 0 };
  }
}

// 回收站内「彻底删除」：无条件物理删除选中条目及其所在整簇（顶层 + 其 delete=1 后代）。
// 不复用 deleteNotes —— 后者按 settings.deleteMode 分支，而这里必须始终物理删除。
function purgeTrashNodes(nodeIds) {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT id, name, top, "delete" FROM notes').all();
    const byId = new Map(rows.map((r) => [r.id, r]));
    const cluster = new Set();
    for (const id of nodeIds) {
      if (byId.get(id)?.delete !== 1) continue; // 只处理回收站中的条目
      for (const cid of collectCluster(id, rows)) cluster.add(cid);
    }
    const trashDir = getTrashDir();
    const ids = [];
    for (const cid of cluster) {
      const r = byId.get(cid);
      if (!r || r.delete !== 1) continue;
      const p = path.join(trashDir, fileNameOf(r));
      if (fs.existsSync(p)) fs.unlinkSync(p);
      ids.push(cid);
    }
    const stmt = db.prepare('DELETE FROM notes WHERE id = ?');
    db.transaction(() => {
      for (const cid of ids) stmt.run(cid);
    })();

    if (ids.length) sweepUnreferencedAttachments();

    return { ok: true, purged: ids.length };
  } catch (error) {
    console.error('purgeTrashNodes error:', error);
    return { error: classifyError(error), originalError: error.message };
  }
}

function registerTrashIPC() {
  ipcMain.handle('deleteNotes', (event, nodeIds) => deleteNotes(nodeIds));
  ipcMain.handle('listTrash', () => listTrash());
  ipcMain.handle('restoreTrash', (event, nodeId) => restoreTrash(nodeId));
  ipcMain.handle('purgeExpiredTrash', () => purgeExpiredTrash());
  ipcMain.handle('purgeTrashNodes', (event, nodeIds) => purgeTrashNodes(nodeIds));
}

module.exports = { registerTrashIPC, deleteNotes, listTrash, restoreTrash, purgeExpiredTrash, purgeTrashNodes };
