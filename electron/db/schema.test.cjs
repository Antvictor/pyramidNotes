const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const { migrateNotes } = require('./schema.cjs');

function freshDb() {
  const db = new Database(':memory:');
  db.exec('create table if not exists notes(id TEXT primary key not null, name TEXT, content TEXT, alias TEXT, top TEXT, left TEXT);');
  return db;
}

test('adds delete and last_up_time columns', () => {
  const db = freshDb();
  migrateNotes(db);
  const cols = db.prepare('PRAGMA table_info(notes)').all().map((c) => c.name);
  assert.ok(cols.includes('delete'));
  assert.ok(cols.includes('last_up_time'));
});

test('existing rows default delete=0 and null last_up_time', () => {
  const db = freshDb();
  db.prepare('INSERT INTO notes (id, name, top) VALUES (?,?,?)').run('1', 'root', '0');
  migrateNotes(db);
  const r = db.prepare('SELECT "delete" AS d, last_up_time AS t FROM notes WHERE id=?').get('1');
  assert.equal(r.d, 0);
  assert.equal(r.t, null);
});

test('is idempotent', () => {
  const db = freshDb();
  migrateNotes(db);
  migrateNotes(db);
  assert.ok(true);
});

test('drops legacy deleted_notes table', () => {
  const db = freshDb();
  db.exec('create table deleted_notes(id text)');
  migrateNotes(db);
  const t = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='deleted_notes'").get();
  assert.equal(t, undefined);
});
