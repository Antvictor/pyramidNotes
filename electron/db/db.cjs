const Database = require('better-sqlite3');
const { app, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

let db = null;

function getDb() {
    return db;
}

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

    // 创建 FTS5 全文搜索虚拟表（只索引 content 字段）
    db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(content);
    `);

    // 创建触发器：插入时同步到 FTS 表
    db.exec(`
        CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
            INSERT INTO notes_fts(rowid, content) VALUES (NEW.rowid, COALESCE(NEW.content, ''));
        END;
    `);

    // 创建触发器：更新时同步到 FTS 表
    db.exec(`
        CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
            UPDATE notes_fts SET content = COALESCE(NEW.content, '') WHERE rowid = NEW.rowid;
        END;
    `);

    // 创建触发器：删除时同步到 FTS 表
    db.exec(`
        CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
            DELETE FROM notes_fts WHERE rowid = OLD.rowid;
        END;
    `);

    // 为现有数据建立索引（先同步现有文件内容到数据库）
    const dataDir = path.join(app.getPath('userData'), 'data');
    try {
        if (fs.existsSync(dataDir)) {
            const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.md'));
            for (const file of files) {
                const nodeId = file.replace('.md', '');
                const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
                db.prepare('UPDATE notes SET content = ? WHERE id = ?').run(content, nodeId);
            }
        }
    } catch (err) {
        console.error('Sync existing files error:', err);
    }

    // 为现有数据建立 FTS 索引
    db.exec(`
        INSERT OR IGNORE INTO notes_fts(rowid, content)
        SELECT rowid, COALESCE(content, '') FROM notes;
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

module.exports = { initializeDatabase, getDb }



