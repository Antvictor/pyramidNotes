// 幂等迁移：notes 增加 "delete"(默认0) / last_up_time；清理历史 deleted_notes 表
function migrateNotes(notesDb) {
  const cols = notesDb.prepare('PRAGMA table_info(notes)').all().map((c) => c.name);
  if (!cols.includes('delete')) {
    notesDb.exec('ALTER TABLE notes ADD COLUMN "delete" INTEGER DEFAULT 0');
  }
  if (!cols.includes('last_up_time')) {
    notesDb.exec('ALTER TABLE notes ADD COLUMN last_up_time TEXT');
  }
  notesDb.exec('DROP TABLE IF EXISTS deleted_notes');
}

module.exports = { migrateNotes };
