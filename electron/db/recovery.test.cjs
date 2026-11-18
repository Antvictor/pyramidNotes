const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { isCorruptError, quarantineDatabaseFiles, openDatabaseWithRecovery } = require('./recovery.cjs');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'pyramid-recovery-'));
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

const createSchema = (conn) => {
  conn.exec('create table notes (id text primary key)');
};

test('isCorruptError recognizes corruption codes and messages', () => {
  assert.equal(isCorruptError(Object.assign(new Error('x'), { code: 'SQLITE_CORRUPT' })), true);
  assert.equal(isCorruptError(Object.assign(new Error('x'), { code: 'SQLITE_CORRUPT_VTAB' })), true);
  assert.equal(isCorruptError(Object.assign(new Error('x'), { code: 'SQLITE_NOTADB' })), true);
  assert.equal(isCorruptError(new Error('database disk image is malformed')), true);
  assert.equal(isCorruptError(new Error('file is not a database')), true);
  assert.equal(isCorruptError(new Error('permission denied')), false);
  assert.equal(isCorruptError(null), false);
});

test('opens a healthy database without recovery', () => {
  const dir = tempDir();
  const dbPath = path.join(dir, '.data');
  try {
    const result = openDatabaseWithRecovery(dbPath, createSchema);
    assert.equal(result.recovered, false);
    assert.deepEqual(result.backupPaths, []);
    result.db.prepare('insert into notes (id) values (?)').run('a');
    assert.equal(result.db.prepare('select count(*) as c from notes').get().c, 1);
    result.db.close();
  } finally {
    cleanup(dir);
  }
});

test('rebuilds a corrupt database and quarantines the original file', () => {
  const dir = tempDir();
  const dbPath = path.join(dir, '.data');
  try {
    fs.writeFileSync(dbPath, 'not a sqlite database');
    const result = openDatabaseWithRecovery(dbPath, createSchema);
    assert.equal(result.recovered, true);
    assert.equal(result.backupPaths.length, 1);
    assert.equal(fs.readFileSync(result.backupPaths[0], 'utf8'), 'not a sqlite database');
    result.db.prepare('insert into notes (id) values (?)').run('b');
    assert.equal(result.db.prepare('select count(*) as c from notes').get().c, 1);
    result.db.close();
  } finally {
    cleanup(dir);
  }
});

test('quarantines wal and shm files together', () => {
  const dir = tempDir();
  const dbPath = path.join(dir, '.data');
  try {
    fs.writeFileSync(dbPath, 'garbage');
    fs.writeFileSync(`${dbPath}-wal`, 'wal');
    fs.writeFileSync(`${dbPath}-shm`, 'shm');
    const date = new Date(2026, 10, 18, 9, 5, 3);
    const moved = quarantineDatabaseFiles(dbPath, date);
    assert.equal(moved.length, 3);
    assert.ok(moved.every((p) => p.includes('.corrupt-20261118-090503')));
    assert.equal(fs.existsSync(dbPath), false);
    assert.equal(fs.existsSync(`${dbPath}-wal`), false);
    assert.equal(fs.existsSync(`${dbPath}-shm`), false);
  } finally {
    cleanup(dir);
  }
});

test('avoids overwriting an existing backup', () => {
  const dir = tempDir();
  const dbPath = path.join(dir, '.data');
  try {
    fs.writeFileSync(dbPath, 'first');
    const date = new Date(2026, 10, 18, 9, 5, 3);
    quarantineDatabaseFiles(dbPath, date);
    fs.writeFileSync(dbPath, 'second');
    const moved = quarantineDatabaseFiles(dbPath, date);
    assert.equal(moved.length, 1);
    assert.ok(moved[0].endsWith('-1'));
    assert.equal(fs.readFileSync(moved[0], 'utf8'), 'second');
  } finally {
    cleanup(dir);
  }
});

test('rethrows non-corruption setup errors without quarantining', () => {
  const dir = tempDir();
  const dbPath = path.join(dir, '.data');
  try {
    assert.throws(() => openDatabaseWithRecovery(dbPath, () => {
      throw new Error('boom');
    }), /boom/);
    assert.equal(fs.readdirSync(dir).filter((name) => name.includes('.corrupt-')).length, 0);
  } finally {
    cleanup(dir);
  }
});
