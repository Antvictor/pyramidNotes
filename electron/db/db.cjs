const Database = require('better-sqlite3');
const { app, ipcMain } = require('electron');
const fs = require('fs');
const  path  = require('path');

const dbPath = path.join(app.getPath('userData'),'data','data');
console.log('Database path:', dbPath);
if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}
const db = new Database(dbPath);

function initializeDatabase() {
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

    // IPC：统一查询接口
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



