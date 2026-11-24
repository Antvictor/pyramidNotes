// 幂等迁移：notes 增加 "delete"(默认0) / last_up_time / sort(默认0)；清理历史 deleted_notes 表
function migrateNotes(notesDb) {
  const cols = notesDb.prepare('PRAGMA table_info(notes)').all().map((c) => c.name);
  if (!cols.includes('delete')) {
    notesDb.exec('ALTER TABLE notes ADD COLUMN "delete" INTEGER DEFAULT 0');
  }
  if (!cols.includes('last_up_time')) {
    notesDb.exec('ALTER TABLE notes ADD COLUMN last_up_time TEXT');
  }
  if (!cols.includes('sort')) {
    notesDb.exec('ALTER TABLE notes ADD COLUMN sort INTEGER DEFAULT 0');
  }
  if (!cols.includes('category')) {
    notesDb.exec('ALTER TABLE notes ADD COLUMN category TEXT');
  }
  if (!cols.includes('availability')) {
    notesDb.exec("ALTER TABLE notes ADD COLUMN availability TEXT DEFAULT 'available'");
  }
  if (!cols.includes('availability_reason')) {
    notesDb.exec('ALTER TABLE notes ADD COLUMN availability_reason TEXT');
  }
  if (!cols.includes('availability_checked_at')) {
    notesDb.exec('ALTER TABLE notes ADD COLUMN availability_checked_at TEXT');
  }
  if (!cols.includes('mtime')) {
    notesDb.exec('ALTER TABLE notes ADD COLUMN mtime INTEGER');
  }
  if (!cols.includes('size')) {
    notesDb.exec('ALTER TABLE notes ADD COLUMN size INTEGER');
  }
  notesDb.exec('DROP TABLE IF EXISTS deleted_notes');
}

module.exports = { migrateNotes };
