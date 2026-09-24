const { getDb } = require("../db/db.cjs");
const { getDataPath } = require("../ipc/userPath.cjs");
const { purgeExpiredTrash } = require("../ipc/trash.cjs");
const { sweepUnreferencedAttachments } = require("../ipc/attachment.cjs");
const { scanNoteFiles, planReconcile, writeNoteTop } = require("./noteSync.cjs");
const fs = require('fs');
const path = require('path');

async function initNode() {
    const db = getDb();
    const storagePath = getDataPath();

    if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
    }

    // 顶层 .md 是唯一事实源：扫目录 → 与 SQL 双向对账（.delete/.data/attachment 天然跳过）
    const { notes, skipped } = scanNoteFiles(storagePath);
    const rows = db.prepare('SELECT id, name, alias, top, "left", content, "delete" FROM notes').all();
    const plan = planReconcile({ notes, skipped, rows });

    const now = new Date().toISOString();
    const insertStmt = db.prepare(`
        INSERT INTO notes (id, name, content, alias, top, "left", last_up_time, "delete")
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);
    const updateStmt = db.prepare(`
        UPDATE notes SET name = ?, alias = ?, top = ?, "left" = ?, content = ?, "delete" = 0, last_up_time = ?
        WHERE id = ?
    `);
    const deleteStmt = db.prepare('DELETE FROM notes WHERE id = ?');

    // 单事务：避免部分写入留下文件与库不一致的中间态
    db.transaction(() => {
        for (const n of plan.inserts) {
            insertStmt.run(n.id, n.name, n.content, n.alias, n.top, n.left, now);
        }
        for (const n of plan.updates) {
            updateStmt.run(n.name, n.alias, n.top, n.left, n.content, now, n.id);
        }
        for (const id of plan.removes) {
            deleteStmt.run(id);
        }
    })();

    // 重挂结果回写文件：让文件与库一致，否则文件里那个不可达的旧上级
    // 会每次启动都被重新判定一遍（幂等，但一直刷告警）
    let rewritten = 0;
    for (const n of plan.reattached) {
        try {
            writeNoteTop(path.join(storagePath, n.file), n.top);
            rewritten += 1;
        } catch (error) {
            console.warn(`[initNode] 回写文件失败 ${n.file}: ${error.message}`);
        }
    }

    for (const s of plan.skipped) console.warn(`[initNode] 跳过文件 ${s.file}: ${s.reason}`);
    for (const w of plan.warn) console.warn(`[initNode] ${w}`);
    console.log(`[initNode] ${storagePath} 扫描 ${notes.length} 个 .md；新增 ${plan.inserts.length}，修复/恢复 ${plan.updates.length}，删除 ${plan.removes.length}，回写文件 ${rewritten}`);

    // 保留期清理与孤儿附件清理：失败不应阻断启动（main.cjs 的 catch 会 app.quit）
    try {
        console.log('Purged expired trash entries:', purgeExpiredTrash().purged);
    } catch (error) {
        console.error('purgeExpiredTrash failed:', error);
    }
    try {
        console.log('Swept unreferenced attachments:', sweepUnreferencedAttachments().removed);
    } catch (error) {
        console.error('sweepUnreferencedAttachments failed:', error);
    }
}

module.exports = { initNode };
