const { parentPort, workerData } = require('worker_threads');
const Database = require('better-sqlite3');

const db = new Database(workerData.dbPath, { readonly: true });
db.loadExtension(workerData.extensionPath);

const SEARCH_SQL = `
  SELECT n.id, n.name, simple_snippet(notes_fts, 1, '<mark>', '</mark>', '...', 30) AS content
  FROM notes_fts
  JOIN notes n ON notes_fts.id = n.id
  WHERE notes_fts MATCH simple_query(?)
  LIMIT 50
`;

parentPort.on('message', (msg) => {
  const { id, keyword } = msg;
  try {
    const rows = db.prepare(SEARCH_SQL).all(keyword);
    parentPort.postMessage({ id, result: rows });
  } catch (e) {
    parentPort.postMessage({ id, error: e.message });
  }
});
