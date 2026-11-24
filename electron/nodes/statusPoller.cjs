// 文件可用性轮询：只 readdir + stat（不读正文、不触发云下载），保持 availability 新鲜。
// 变化仅在「实际不同」时 UPDATE（避免刷 FTS 触发器），并通过 notes:statusChanged 通知渲染端。
const { getDb } = require('../db/db.cjs');
const repository = require('../source/noteRepository.cjs');

const BASE_INTERVAL_MS = 10000;   // 聚焦
const BLUR_INTERVAL_MS = 60000;   // 失焦

function matchRowByPrefix(file, rows) {
  let best = null;
  for (const r of rows) {
    if (r && r.id && file.startsWith(`${r.id}-`)) {
      if (!best || String(r.id).length > String(best.id).length) best = r;
    }
  }
  return best;
}

function startStatusPolling({ win, getStoragePath, isBusy, requestReconcile }) {
  let timer = null;
  let stopped = false;

  const tick = async () => {
    if (stopped) return;
    if (!win || (win.isDestroyed && win.isDestroyed())) return;
    if (isBusy && isBusy()) return; // 启动/增量对账进行中，避免与其他写者竞争
    const db = getDb();
    if (!db) return;

    let files;
    try {
      files = await repository.listFiles(getStoragePath());
    } catch (e) {
      return; // 目录暂不可读：本轮不改状态
    }
    // 聚合护栏：目录里没有任何 .md → 视为存储挂起，不批量判定缺失
    if (!files.length) return;

    const rows = db.prepare('SELECT id, name, "delete", availability, availability_reason, mtime FROM notes WHERE "delete" = 0').all();
    if (!rows.length) return;

    const now = new Date().toISOString();
    const updates = [];
    let needReconcile = false;

    for (const row of rows) {
      const f = files.find((x) => x.file.startsWith(`${row.id}-`));
      let availability;
      let reason = null;
      if (!f) {
        availability = 'missing';
      } else if (f.dataless) {
        availability = 'unavailable';
        reason = 'not_downloaded';
      } else if (!(await repository.canRead(f.filePath))) {
        // chmod 000 等：轮询只 stat 看不到，这里额外做一次权限探测（不读正文）
        availability = 'unavailable';
        reason = 'permission';
      } else {
        availability = 'available';
        // 可读但 mtime 变了 → 正文可能变，交给对账增量读取
        if (row.mtime != null && Number(row.mtime) !== f.mtimeMs) needReconcile = true;
      }
      const prev = row.availability ?? 'available';
      const prevReason = row.availability_reason ?? null;
      if (prev !== availability || prevReason !== reason) {
        updates.push({ id: row.id, availability, reason });
      }
    }

    // 出现「可读、但匹配不到任何行」的新文件 → 触发一次增量对账导入
    for (const f of files) {
      if (f.dataless) continue;
      if (!matchRowByPrefix(f.file, rows)) { needReconcile = true; break; }
    }

    if (updates.length) {
      const stmt = db.prepare('UPDATE notes SET availability = ?, availability_reason = ?, availability_checked_at = ? WHERE id = ?');
      db.transaction(() => {
        for (const u of updates) stmt.run(u.availability, u.reason ?? null, now, u.id);
      })();
      if (win && !(win.isDestroyed && win.isDestroyed())) {
        win.webContents.send('notes:statusChanged', updates);
      }
    }

    if (needReconcile && requestReconcile) requestReconcile();
  };

  const schedule = () => {
    if (stopped) return;
    const focused = !win || (win.isDestroyed && win.isDestroyed()) ? true : (typeof win.isFocused === 'function' ? win.isFocused() : true);
    const interval = focused ? BASE_INTERVAL_MS : BLUR_INTERVAL_MS;
    timer = setTimeout(async () => {
      try { await tick(); } catch (e) { console.error('[statusPoll] tick failed:', e); }
      schedule();
    }, interval);
  };

  schedule();

  return {
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
    tick, // 供测试/手动触发
  };
}

module.exports = { startStatusPolling, BASE_INTERVAL_MS, BLUR_INTERVAL_MS };
