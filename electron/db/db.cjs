const Database = require('better-sqlite3');
const { app, ipcMain } = require('electron');
const { path } = require('path');

const dbPath = path.join(app.getPath('userData') + "/data", 'data');
const db = new Database(dbPath);

function initializeDatabase() {
    db.exec(`
        create table if not exists notes(
            id integer primary key autoincrement,
            name TEXT,
            content TEXT,
            alias TEXT
        );
        create table if not exists graphs(
            id integer primary key autoincrement,
            top integer,
            left integer
        );
        `);

    // IPC：统一查询接口
    ipcMain.handle('db-query', (event, sql, params = []) => {
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



