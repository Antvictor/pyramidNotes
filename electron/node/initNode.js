const { getDb } = require("../db/db.cjs");
const { readFile } = require("../ipc/file.cjs");
const { getPath } = require("../ipc/userPath.cjs");
const fs = require('fs');
const path = require("path");


async function initNode() {
    // 查询数据库是否有数据，如果没有则扫描 data 目录下的 markdown 文件，读取其 front-matter 中的 id 和 content 字段，存入数据库
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) as count FROM notes').get();
    if (row.count > 0) {
        console.log('Database already initialized with data.');
        return;
    }

    console.log('Initializing database with markdown files from data directory...');
    // 扫描 data 目录下的所有 markdown 文件，读取其 front-matter 中的 id 和 content 字段，存入数据库
    const dataPath = getPath();
    if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath, { recursive: true });
    }
    const files = fs.readdirSync(dataPath);
    // const db = getDb();
    for (const file of files) {
        if (path.extname(file) === '.md') {
            const filePath = path.join(dataPath, file);
            console.log(`Reading file: ${filePath}`);
            const { data, content } =  await readFile(filePath);
            console.log(`Processing file: ${data}`);
            console.log(`Processing file: ${data.id} ${data.title}  ${data.alias} ${data.top} ${data.left}`);

            if (data && data.id) {
                // 插入或更新数据库记录
                db.prepare(`
                    INSERT INTO notes (id, name, content,alias,top,left)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET content=excluded.content
                `).run(data.id, data.title || "", content, data.alias || null, data.top || null, data.left || null);
            }
        }
    };
}
module.exports = { initNode }