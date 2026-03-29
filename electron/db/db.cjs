const Database = require('better-sqlite3');
const { app, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getBasePath } = require('../window/window.cjs');

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


    // 加载插件
    loadPlugins(db);

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

    function loadPlugins(db) {
        db.pragma('journal_mode = WAL');

        // 允许加载扩展
        db.loadExtension = db.loadExtension || db.loadExtension;
        // 加载插件
        loadFts5(db);
    };

    function getRealArch() {
        if (process.platform === 'darwin') {
            try {
                return execSync('uname -m').toString().trim();
            } catch { }
        }

        if (process.platform === 'win32') {
            return (
                process.env.PROCESSOR_ARCHITEW6432 ||
                process.env.PROCESSOR_ARCHITECTURE
            );
        }

        return process.arch;
    }

    function resolveExt() {
        const map = {
            win32: 'dll',
            darwin: 'dylib',
            linux: 'so',
        };
        return map[process.platform];
    }

    function normalizeArch(arch) {
        if (arch === 'x86_64' || arch === 'AMD64') return 'x64';
        if (arch === 'arm64') return 'arm64';
        return 'x86';
    }

    function loadFts5(db) {
        const arch = normalizeArch(getRealArch());
        const ext = resolveExt();

        const basePath = getBasePath();
        // 打包后资源目录（关键）

        const filePath = path.join(
            basePath,
            'sqlite-plugins',
            `${process.platform}-${arch}`,
            `libsimple.${ext}`
        );

        console.log('Load extension:', filePath);

        db.loadExtension(filePath);
    }
}

module.exports = { initializeDatabase, getDb }



