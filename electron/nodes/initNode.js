const { getDb } = require("../db/db.cjs");
const { getDataPath } = require("../ipc/userPath.cjs");
const { purgeExpiredTrash } = require("../ipc/trash.cjs");
const fs = require('fs');
const path = require("path");
const matter = require('gray-matter');

async function initNode() {
    console.log('Starting incremental sync...');

    const db = getDb();
    const storagePath = getDataPath();

    console.log('Using storage path:', storagePath);

    if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
    }

    // 扫描 storagePath 下的 .md（.delete/.data 为子目录/非 .md，天然跳过）
    let fileSet = new Set();
    try {
        for (const file of fs.readdirSync(storagePath)) {
            if (path.extname(file) === '.md') fileSet.add(file);
        }
    } catch (error) {
        console.error('Error reading storage directory:', error);
    }
    console.log('Found', fileSet.size, 'markdown files in storagePath');

    const notes = db.prepare('SELECT id FROM notes').all();
    const dbIds = new Set(notes.map((n) => n.id));

    // 文件存在但 DB 无记录 → 插入
    for (const file of fileSet) {
        const filePath = path.join(storagePath, file);
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const parsed = matter(content);
            if (parsed.data && parsed.data.id && !dbIds.has(parsed.data.id)) {
                console.log('Inserting new note:', parsed.data.id, 'from file:', file);
                db.prepare(`
                    INSERT INTO notes (id, name, content, alias, top, "left", last_up_time)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET content=excluded.content
                `).run(
                    parsed.data.id,
                    parsed.data.title || parsed.data.name || "",
                    content,
                    parsed.data.alias || null,
                    parsed.data.top || null,
                    parsed.data.left || null,
                    new Date().toISOString()
                );
            }
        } catch (error) {
            console.error('Error processing file', file, ':', error.message);
        }
    }

    // 保留期清理（回收站中超过 trashRetentionDays 的条目彻底删除）
    const { purged } = purgeExpiredTrash();
    console.log('Purged expired trash entries:', purged);

    console.log('Incremental sync completed');
}

module.exports = { initNode };
