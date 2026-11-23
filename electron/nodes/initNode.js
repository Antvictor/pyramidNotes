const { getDb } = require("../db/db.cjs");
const { getDataPath } = require("../ipc/userPath.cjs");
const { purgeExpiredTrash } = require("../ipc/trash.cjs");
const { sweepUnreferencedAttachments } = require("../ipc/attachment.cjs");
const { scanNoteFiles, scanTrashFiles, planReconcile, writeNoteTop } = require("./noteSync.cjs");
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

    const now = new Date().toISOString();

    // 回收站文件只存在于 .delete/：据此补回 delete=1 行（DB 重建后尤其重要），
    // 既恢复回收站列表，也保护仅被回收站笔记引用的附件不被清理
    const trashNotes = scanTrashFiles(storagePath);
    let trashRestored = 0;
    if (trashNotes.length) {
        const insertTrash = db.prepare(`
            INSERT OR IGNORE INTO notes (id, name, content, alias, top, "left", last_up_time, "delete", sort, category)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        `);
        db.transaction(() => {
            for (const n of trashNotes) {
                const info = insertTrash.run(n.id, n.name, n.content, n.alias, n.top, n.left, n.lastUpTime ?? now, n.sort, n.category);
                trashRestored += info.changes;
            }
        })();
    }

    // 读到刚补回的回收站行，供对账沿 top 链上溯
    const rows = db.prepare('SELECT id, name, alias, top, "left", content, "delete", sort, category FROM notes').all();
    const plan = planReconcile({ notes, skipped, rows });

    const insertStmt = db.prepare(`
        INSERT INTO notes (id, name, content, alias, top, "left", last_up_time, "delete", sort, category)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);
    const updateStmt = db.prepare(`
        UPDATE notes SET name = ?, alias = ?, top = ?, "left" = ?, content = ?, "delete" = 0, last_up_time = ?, sort = ?, category = ?
        WHERE id = ?
    `);
    const deleteStmt = db.prepare('DELETE FROM notes WHERE id = ?');

    // 单事务：避免部分写入留下文件与库不一致的中间态
    db.transaction(() => {
        for (const n of plan.inserts) {
            insertStmt.run(n.id, n.name, n.content, n.alias, n.top, n.left, now, n.sort, n.category);
        }
        for (const n of plan.updates) {
            updateStmt.run(n.name, n.alias, n.top, n.left, n.content, now, n.sort, n.category, n.id);
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
    console.log(`[initNode] ${storagePath} 扫描 ${notes.length} 个 .md；新增 ${plan.inserts.length}，修复/恢复 ${plan.updates.length}，删除 ${plan.removes.length}，回写文件 ${rewritten}，回收站补回 ${trashRestored}`);

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

    return { nodeCount: notes.length, trashCount: trashNotes.length };
}

module.exports = { initNode };
