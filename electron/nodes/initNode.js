const { getDb } = require("../db/db.cjs");
const { getDataPath } = require("../ipc/userPath.cjs");
const { purgeExpiredTrash } = require("../ipc/trash.cjs");
const { sweepUnreferencedAttachments } = require("../ipc/attachment.cjs");
const { planReconcile, writeNoteTop } = require("./noteSync.cjs");
const repository = require("../source/noteRepository.cjs");
const fs = require('fs');
const path = require('path');

// 列清单（多处显式列出，加字段必须逐处同步，否则对账不到）：
const ROW_COLUMNS = 'id, name, alias, top, "left", content, "delete", sort, category, availability, availability_reason, mtime, size';

async function initNode() {
    const db = getDb();
    const storagePath = getDataPath();

    if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
    }

    const now = new Date().toISOString();

    // 回收站文件仅存在于 .delete/：据此补回 delete=1 行（dataless 安全跳过、带超时）
    const trashNotes = await repository.scanTrash({ storagePath });
    let trashRestored = 0;
    if (trashNotes.length) {
        const insertTrash = db.prepare(`
            INSERT OR IGNORE INTO notes (id, name, content, alias, top, "left", last_up_time, "delete", sort, category, availability, availability_reason, mtime, size)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'available', NULL, NULL, NULL)
        `);
        db.transaction(() => {
            for (const n of trashNotes) {
                const info = insertTrash.run(n.id, n.name, n.content, n.alias, n.top, n.left, n.lastUpTime ?? now, n.sort, n.category);
                trashRestored += info.changes;
            }
        })();
    }

    // 读现有行（含可用性/mtime/size），供扫描做增量判断与纯函数对账
    const rows = db.prepare(`SELECT ${ROW_COLUMNS} FROM notes`).all();

    // 扫描顶层 .md（异步 + 限并发 + 超时 + 增量 + dataless 安全）；只产 I/O 事实
    const scan = await repository.scanNotes({ storagePath, rows });

    // 纯函数对账：新增/更新 + 可用性标记（缺失/读不到）+ 重挂；不再硬删
    const plan = planReconcile({
        notes: scan.notes,
        unchanged: scan.unchanged,
        unreadable: scan.unreadable,
        skipped: scan.skipped,
        rows,
        storageUnavailable: scan.storageUnavailable,
    });

    const insertStmt = db.prepare(`
        INSERT INTO notes (id, name, content, alias, top, "left", last_up_time, "delete", sort, category, availability, availability_reason, availability_checked_at, mtime, size)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'available', NULL, ?, ?, ?)
    `);
    const updateStmt = db.prepare(`
        UPDATE notes SET name = ?, alias = ?, top = ?, "left" = ?, content = ?, "delete" = 0, last_up_time = ?, sort = ?, category = ?, availability = 'available', availability_reason = NULL, availability_checked_at = ?, mtime = ?, size = ?
        WHERE id = ?
    `);
    const markStmt = db.prepare(`
        UPDATE notes SET availability = ?, availability_reason = ?, availability_checked_at = ?
        WHERE id = ?
    `);

    // 单事务：避免部分写入留下文件与库不一致的中间态
    db.transaction(() => {
        for (const n of plan.inserts) {
            insertStmt.run(n.id, n.name, n.content, n.alias, n.top, n.left, now, n.sort, n.category, now, n.mtime ?? null, n.size ?? null);
        }
        for (const n of plan.updates) {
            updateStmt.run(n.name, n.alias, n.top, n.left, n.content, now, n.sort, n.category, now, n.mtime ?? null, n.size ?? null, n.id);
        }
        for (const m of plan.availabilityMarks) {
            markStmt.run(m.availability, m.reason ?? null, now, m.id);
        }
    })();

    // 重挂结果回写文件（仅可读文件；dataless/缺失不会进入这里）
    let rewritten = 0;
    for (const n of plan.reattachments) {
        try {
            writeNoteTop(path.join(storagePath, n.file), n.top);
            rewritten += 1;
        } catch (error) {
            console.warn(`[initNode] 回写文件失败 ${n.file}: ${error.message}`);
        }
    }

    for (const s of plan.skipped) console.warn(`[initNode] 跳过文件 ${s.file}: ${s.reason}`);
    for (const u of scan.unreadable) console.warn(`[initNode] 暂缓文件（不可读）${u.file}: ${u.reason}`);
    for (const f of scan.unmatchedFilenames) console.warn(`[initNode] 未匹配到行的文件: ${f}`);
    for (const w of plan.warn) console.warn(`[initNode] ${w}`);
    console.log(`[initNode] ${storagePath} 可读 ${scan.notes.length}，未变 ${scan.unchanged.length}，不可读 ${scan.unreadable.length}；新增 ${plan.inserts.length}，修复/恢复 ${plan.updates.length}，可用性标记 ${plan.availabilityMarks.length}，回写文件 ${rewritten}，回收站补回 ${trashRestored}，存储${scan.storageUnavailable ? '不可用(已跳过)' : '正常'}`);

    // 保留期清理与孤儿附件清理：失败不应阻断启动
    try {
        console.log('Purged expired trash entries:', (await purgeExpiredTrash()).purged);
    } catch (error) {
        console.error('purgeExpiredTrash failed:', error);
    }
    try {
        console.log('Swept unreferenced attachments:', (await sweepUnreferencedAttachments()).removed);
    } catch (error) {
        console.error('sweepUnreferencedAttachments failed:', error);
    }

    return { nodeCount: scan.notes.length + scan.unchanged.length, trashCount: trashNotes.length };
}

module.exports = { initNode };
