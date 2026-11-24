const fs = require('fs');
const matter = require('gray-matter');
const yaml = require('yaml');
const { ROOT_TOP } = require('../ipc/trashUtils.cjs');

const ROOT_ID = '1';

// frontmatter 值规整：空/缺失 → null，其余一律 String()。
// YAML 里不带引号的数字会被解析成 number，原样绑定进 TEXT 列会被 SQLite 转成
// '1' -> '1.0'，与任何 id 都不相等，节点吊空后在脑图上不可见。
// 必须收敛在这一层：渲染侧依赖 `top === '0'`、`nodeMap.has(top)` 的严格字符串比较。
function toStr(value) {
  if (value === undefined || value === null) return null;
  const s = String(value);
  return s === '' ? null : s;
}

// sort 是全局递增整数：缺省/非法值统一为 0，与 DB 列默认值一致，避免每次对账都判为差异。
function toSort(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

// iCloud「优化 Mac 存储」会驱逐文件内容：inode 元数据仍在，但正文需联网下载。
// 这种 dataless 文件 readFile 会永久阻塞（open 成功、read 不返回），把主线程卡死、窗口永不显示。
// stat 只读元数据、不触发下载；大小 > 0 且占用 0 块即为 dataless。仅 macOS 有该语义。
function isDataless(stat) {
  return process.platform === 'darwin' && stat.blocks === 0 && stat.size > 0;
}

function normalizeFields(data) {
  const d = data && typeof data === 'object' ? data : {};
  return {
    id: toStr(d.id),
    name: toStr(d.title) ?? toStr(d.name) ?? '',
    alias: toStr(d.alias),
    top: toStr(d.top),
    left: toStr(d.left),
    sort: toSort(d.sort),
    category: toStr(d.category),
  };
}

// 根行保护：不看 top 单字段，因为历史 bug 已把根行 top 写成 NULL
function isProtectedRoot(row) {
  return !!row && (String(row.id) === ROOT_ID || row.top === ROOT_TOP);
}

// 把修正后的 top 写回文件，保留其余 frontmatter 与正文。
// 只用于「已成功读到」的可读文件（重挂的对象），不涉及会阻塞的 dataless 文件。
function writeNoteTop(filePath, top) {
  const parsed = matter(fs.readFileSync(filePath, 'utf-8'));
  const merged = {
    ...(parsed.data && typeof parsed.data === 'object' ? parsed.data : {}),
    top,
  };
  fs.writeFileSync(filePath, `---\n${yaml.stringify(merged).trim()}\n---\n${parsed.content}`, 'utf-8');
}

function differs(row, note) {
  return (row.name ?? null) !== note.name
    || (row.alias ?? null) !== note.alias
    || (row.top ?? null) !== note.top
    || (row.left ?? null) !== note.left
    || (row.content ?? null) !== note.content
    || (row.category ?? null) !== (note.category ?? null)
    || Number(row.sort ?? 0) !== Number(note.sort ?? 0);
}

// 纯函数：输入「扫描事实 + DB 快照」，输出「增/改 / 可用性标记 / 重挂 / 告警」，不碰 db、不读文件。
// 事实来自 Repository.scanNotes：
//   notes      —— 可读且新增/变更（含 content、mtime、size）
//   unchanged  —— 可读且 mtime+size 未变（未读正文，视为 available）
//   unreadable —— 存在但读不出（dataless/超时/权限…），带 reason
// 对账「不再硬删」：目录里没有的行一律保留，标记 availability=missing（或 unreadable），交给用户在动作时处置。
function planReconcile({
  notes, unchanged = [], unreadable = [], skipped = [], rows, storageUnavailable = false,
}) {
  const warn = [];

  // 浅拷贝文件侧节点，避免就地修改输入（纯函数）
  const fileById = new Map();
  for (const note of notes) {
    if (fileById.has(note.id)) warn.push(`多份文件共用 id: ${note.id}`);
    fileById.set(note.id, { ...note, delete: 0 });
  }
  const unchangedIds = new Set(unchanged.map((u) => u.id));
  const unreadableById = new Map();
  for (const u of unreadable) unreadableById.set(u.id, u.reason || 'io_error');

  const rowById = new Map();
  for (const row of rows) {
    if (rowById.has(row.id)) warn.push(`DB 重复 id: ${row.id}`);
    rowById.set(row.id, row);
  }

  // 存储不可信（目录空/读不动）：不标记任何缺失、不重挂，只保证不破坏
  if (storageUnavailable) {
    warn.push('存储不可用，跳过对账（不标记缺失、不重挂）');
    return { inserts: [], updates: [], availabilityMarks: [], reattachments: [], skipped, warn };
  }

  // 可见集合：所有未删除的行（对账不删，均保留）+ 所有可读文件（写后 delete=0）
  const visibleIds = new Set();
  for (const r of rows) {
    if (Number(r.delete) === 0) visibleIds.add(r.id);
  }
  for (const id of fileById.keys()) visibleIds.add(id);

  // 根 id：优先文件侧/行侧 top===ROOT_TOP 的可见节点（不硬编码 '1'），退回可见的 '1'
  const rootFromFile = [...fileById.values()].find((n) => n.top === ROOT_TOP);
  const rootFromRow = rows.find((r) => Number(r.delete) === 0 && r.top === ROOT_TOP);
  const rootId = rootFromFile?.id ?? rootFromRow?.id ?? (visibleIds.has(ROOT_ID) ? ROOT_ID : null);

  // 沿 DB 的 top 链上溯，返回第一个可见祖先（可穿过已软删/已失踪的父节点）。
  // 不直接挂根：App 删节点时把子节点提升到「上一级」（MindMap.jsx promoteChildren），
  // 只有落到同一个祖先上才与 App 语义一致。
  const nearestVisibleAncestor = (startId) => {
    let current = startId;
    const seen = new Set();
    while (current && !seen.has(current)) {
      if (visibleIds.has(current)) return current;
      seen.add(current);
      const parentRow = rowById.get(current);
      current = parentRow ? parentRow.top : null;
    }
    return null;
  };

  // 可见性不变量：可读节点必须可从根可达（仅在文件侧重挂，不改不可读文件）
  const reattachments = [];
  for (const note of fileById.values()) {
    if (note.id === rootId) continue;
    if (note.top === ROOT_TOP) continue;
    if (note.top && visibleIds.has(note.top)) continue;
    const target = (note.top && nearestVisibleAncestor(note.top)) || rootId;
    if (!target) {
      warn.push(`根节点不可用，跳过重挂: ${note.id} (top=${note.top ?? 'null'})`);
      continue;
    }
    const where = target === rootId ? '根' : '最近可用祖先';
    warn.push(`父节点不可达，重挂到${where}: ${note.id} (top=${note.top ?? 'null'} -> ${target})`);
    note.top = target;
    if (note.file) reattachments.push({ file: note.file, id: note.id, top: target });
  }

  const inserts = [];
  const updates = [];
  for (const note of fileById.values()) {
    const row = rowById.get(note.id);
    if (!row) { inserts.push(note); continue; }
    if (Number(row.delete) === 1) warn.push(`文件回到目录，自动恢复: ${note.id}`);
    if (Number(row.delete) === 1 || differs(row, note)) updates.push(note);
  }

  // 可用性判定（仅「未删除的行」与「本次被恢复的行」）：
  // 优先级：读过(notes) / 未变(unchanged) → available；读不出(unreadable) → unavailable；
  // 其余无文件 → missing。只在最终值与库中不同的时候产出 mark。
  const availabilityMarks = [];
  for (const row of rows) {
    const isLive = Number(row.delete) === 0;
    const restored = Number(row.delete) === 1 && fileById.has(row.id);
    if (!isLive && !restored) continue; // 仍在回收站且未回来：不判可用性

    let availability = 'available';
    let reason = null;
    if (fileById.has(row.id) || unchangedIds.has(row.id)) {
      availability = 'available';
    } else if (unreadableById.has(row.id)) {
      availability = 'unavailable';
      reason = unreadableById.get(row.id);
    } else {
      availability = 'missing';
    }

    const prev = row.availability ?? 'available';
    const prevReason = row.availability_reason ?? null;
    if (prev !== availability || prevReason !== reason) {
      availabilityMarks.push({ id: row.id, availability, reason });
    }
  }

  return { inserts, updates, availabilityMarks, reattachments, skipped, warn };
}

module.exports = {
  ROOT_ID, normalizeFields, isProtectedRoot, isDataless, planReconcile, writeNoteTop,
};
