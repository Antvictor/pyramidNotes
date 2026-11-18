const Database = require('better-sqlite3');
const fs = require('fs');

const CORRUPT_CODES = new Set(['SQLITE_CORRUPT', 'SQLITE_CORRUPT_VTAB', 'SQLITE_NOTADB']);
const CORRUPT_MESSAGE = /database disk image is malformed|file is not a database|file is encrypted/i;

function isCorruptError(error) {
  if (!error) return false;
  const code = String(error.code || '');
  if (CORRUPT_CODES.has(code) || code.startsWith('SQLITE_CORRUPT')) return true;
  return CORRUPT_MESSAGE.test(String(error.message || ''));
}

function formatStamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
    + `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function uniquePath(target) {
  if (!fs.existsSync(target)) return target;
  let index = 1;
  while (fs.existsSync(`${target}-${index}`)) index += 1;
  return `${target}-${index}`;
}

// 损坏库及 -wal/-shm 一并改名留存，绝不删除用户文件
function quarantineDatabaseFiles(dbPath, date = new Date()) {
  const stamp = formatStamp(date);
  const moved = [];
  for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    if (!fs.existsSync(file)) continue;
    const dest = uniquePath(`${file}.corrupt-${stamp}`);
    fs.renameSync(file, dest);
    moved.push(dest);
  }
  return moved;
}

// 首次打开执行 setup；仅当确认是损坏错误时才隔离原文件并重建。
// 其他错误（权限、扩展缺失等）原样抛出，避免误伤正常的数据库。
function openDatabaseWithRecovery(dbPath, setup, now = () => new Date()) {
  let connection = null;
  try {
    connection = new Database(dbPath);
    setup(connection);
    return { db: connection, recovered: false, backupPaths: [] };
  } catch (error) {
    try {
      connection?.close();
    } catch {
      // ignore
    }
    if (!isCorruptError(error)) throw error;

    const backupPaths = quarantineDatabaseFiles(dbPath, now());
    const fresh = new Database(dbPath);
    try {
      setup(fresh);
    } catch (setupError) {
      try {
        fresh.close();
      } catch {
        // ignore
      }
      throw setupError;
    }
    return { db: fresh, recovered: true, backupPaths };
  }
}

module.exports = { isCorruptError, quarantineDatabaseFiles, openDatabaseWithRecovery };
