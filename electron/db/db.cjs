const Database = require('better-sqlite3');
const { app, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getBasePath } = require('../window/window.cjs');

let db = null;
let isInitialized = false;

function getDb() {
    return db;
}

function closeDatabase() {
    if (db) {
        try {
            db.close();
            console.log('Database closed successfully');
        } catch (e) {
            console.error('Error closing database:', e);
        }
        db = null;
    }
    isInitialized = false;
}

function initializeDatabase(storagePath) {
    // If already initialized, close first
    if (isInitialized && db) {
        closeDatabase();
    }

    // Use storagePath/.data as the database file location
    const dbDir = storagePath;
    const dbPath = path.join(dbDir, '.data');
    console.log('Database path:', dbPath);

    // Ensure storage path exists
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(dbPath);

    // Mark as initialized
    isInitialized = true;

    // Set hidden attribute on Windows
    if (process.platform === 'win32') {
        try {
            const { execSync } = require('child_process');
            // Use attrib command to set hidden attribute on the .data file
            execSync(`attrib +H "${dbPath}"`, { windowsHide: true });
        } catch (e) {
            console.log('Could not set hidden attribute:', e);
        }
    }

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

    // 创建 deleted_notes 表用于软删除
    db.exec(`
        create table if not exists deleted_notes(
            id TEXT primary key not null,
            filename TEXT NOT NULL,
            content TEXT,
            yaml_data TEXT,
            deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            original_path TEXT
        );
    `);

    // 创建 FTS5 全文搜索虚拟表（使用 simple_tokenizer 支持中文分词）
    // id 列使用 UNINDEXED 表示不参与搜索，只存储用于关联
    db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
            id UNINDEXED,
            content,
            tokenize='simple'
        );
    `);

    // 创建触发器：插入时同步到 FTS 表
    db.exec(`
        CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
            INSERT INTO notes_fts(rowid, id, content) VALUES (NEW.rowid, NEW.id, COALESCE(NEW.content, ''));
        END;
    `);

    // 创建触发器：更新时同步到 FTS 表（只更新 content，id 不变）
    db.exec(`
        CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
            UPDATE notes_fts SET content = COALESCE(NEW.content, '') WHERE id = NEW.id;
        END;
    `);

    // 创建触发器：删除时同步到 FTS 表
    db.exec(`
        CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
            DELETE FROM notes_fts WHERE rowid = OLD.rowid;
        END;
    `);

    // 为现有数据建立 FTS 索引（先清空再重建，避免 rowid 冲突）
    db.exec(`
        DELETE FROM notes_fts;
        INSERT INTO notes_fts(rowid, id, content)
        SELECT rowid, id, COALESCE(content, '') FROM notes;
    `);

    // Register dbQuery handler only once
    if (!initializeDatabase.handlersRegistered) {
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
        initializeDatabase.handlersRegistered = true;
    }

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

        // 打印 libsimple 提供的所有函数
        const functions = db.prepare(`
            SELECT name, type
            FROM pragma_function_list
            WHERE name LIKE 'simple%' OR name LIKE 'jieba%'
        `).all();
        console.log('libsimple functions:', JSON.stringify(functions, null, 2));
    }
}

module.exports = { initializeDatabase, getDb, closeDatabase, isInitialized: () => isInitialized }



