const Database = require('better-sqlite3');
const { app, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

let db = null;

function initializeDatabase() {
    const dbPath = path.join(app.getPath('userData'), 'data', 'data');
    console.log('Database path:', dbPath);
    if (!fs.existsSync(path.dirname(dbPath))) {
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    db = new Database(dbPath);

    db.exec(`
        create table if not exists notes(
            id TEXT primary key not null,
            name TEXT,
            content TEXT,
            alias TEXT,
            top TEXT,
            left TEXT
        );
    `);

    ipcMain.handle('dbQuery', (event, sql, params = []) => {
        try {
            const stmt = db.prepare(sql);
            if (sql.trim().toUpperCase().startsWith('SELECT')) {
                return stmt.all(...params);
            } else {
                return stmt.run(...params);
            }
        } catch (err) {
            console.error('DB Error:', err);
            return null;
        }
    });
}

module.exports = { initializeDatabase }



