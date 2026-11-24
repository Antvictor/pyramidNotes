// 文件可用性相关 IPC：点击复核（当场核验单文件）+ 从缓存恢复（重建 .md）。
const { ipcMain } = require('electron');
const path = require('path');
const { getDb } = require('../db/db.cjs');
const { getDataPath } = require('./userPath.cjs');
const repository = require('../source/noteRepository.cjs');

const fileOf = (row) => `${row.id}-${row.name}.md`;

// 当场核验单个笔记文件的可用性，更新并返回 { availability, reason }。
async function recheckAvailability(id) {
  const db = getDb();
  if (!db) return { availability: 'unavailable', reason: 'io_error' };
  const row = db.prepare('SELECT id, name FROM notes WHERE id = ?').get(id);
  if (!row) return { availability: 'missing', reason: null };

  const storagePath = getDataPath();
  const filePath = path.join(storagePath, fileOf(row));
  const now = new Date().toISOString();

  let availability = 'available';
  let reason = null;
  let st = null;
  try { st = await repository.stat(filePath); } catch { st = null; }

  if (!st) {
    availability = 'missing';
  } else if (repository.isDataless(st)) {
    availability = 'unavailable';
    reason = 'not_downloaded';
  } else {
    const r = await repository.readNote(filePath, { timeoutMs: 5000 });
    if (r.unavailable) {
      availability = 'unavailable';
      reason = r.reason;
    }
  }

  db.prepare('UPDATE notes SET availability = ?, availability_reason = ?, availability_checked_at = ? WHERE id = ?')
    .run(availability, reason, now, id);

  return { availability, reason };
}

// 从缓存恢复：用 DB 行重建 .md（frontmatter + content）；无行则建空白占位。
async function recoverFromCache(id) {
  const db = getDb();
  if (!db) return { error: 'db_unavailable' };
  const storagePath = getDataPath();
  const now = new Date().toISOString();

  let row = db.prepare('SELECT id, name, content, alias, top, "left", sort, category FROM notes WHERE id = ?').get(id);
  if (!row) {
    // 无缓存内容：建空白占位（保留 id，供被引用的结构继续挂载）
    row = { id, name: '', content: '', alias: null, top: null, left: null, sort: 0, category: null };
    db.prepare(`INSERT OR IGNORE INTO notes (id, name, content, alias, top, "left", sort, category, "delete", last_up_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`)
      .run(row.id, row.name, row.content, row.alias, row.top, row.left, Number(row.sort) || 0, row.category, now);
  }

  const filePath = path.join(storagePath, `${row.id}-${row.name}.md`);
  try {
    await repository.writeNote(filePath, {
      yaml: { id: row.id, alias: row.alias ?? '', title: row.name, left: row.left, top: row.top, sort: row.sort, category: row.category },
      content: row.content ?? '',
    });
  } catch (e) {
    return { error: 'write_failed', message: e.message };
  }

  let mtime = null; let size = null;
  try { const st = await repository.stat(filePath); mtime = st.mtimeMs; size = st.size; } catch { /* ignore */ }

  db.prepare('UPDATE notes SET availability = ?, availability_reason = NULL, availability_checked_at = ?, mtime = ?, size = ? WHERE id = ?')
    .run('available', now, mtime, size, id);

  return { ok: true, availability: 'available' };
}

function registerNoteStatusIPC() {
  ipcMain.handle('note:recheckAvailability', (_e, id) => recheckAvailability(id));
  ipcMain.handle('note:recoverFromCache', (_e, id) => recoverFromCache(id));
}

module.exports = { registerNoteStatusIPC, recheckAvailability, recoverFromCache };
