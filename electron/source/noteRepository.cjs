// 文件访问唯一入口（Source/Repository）。
// 目标：把「读文件」与主线程/启动解耦（异步 + 超时），并在这一层判定文件可用性。
// 保持 Markdown 为真源、SQLite 为缓存：这里只负责 I/O 与事实产出，对账策略在 noteSync.planReconcile（纯）。
const fs = require('fs/promises');
const path = require('path');
const matter = require('gray-matter');
const yaml = require('yaml');
const { constants: FS_CONST } = require('fs');
const { isDataless, normalizeFields } = require('../nodes/noteSync.cjs');

const DEFAULT_CONCURRENCY = 4;
const DEFAULT_FILE_TIMEOUT_MS = 2000;
const DEFAULT_BUDGET_MS = 5000;
// 连续这么多次读取超时后，剩余待读文件直接判超时、不再发起读（防止把 libuv 线程池漏占光）
const CONSECUTIVE_TIMEOUT_LIMIT = 3;

// ---------- 通用原语（供 trash/attachment 复用，行为不变） ----------
const stat = (p) => fs.stat(p);
const readdir = (p) => fs.readdir(p);
// enc 省略时返回 Buffer（供二进制附件）
const readFile = (p, enc) => (enc ? fs.readFile(p, enc) : fs.readFile(p));
const writeFile = (p, data) => (Buffer.isBuffer(data) ? fs.writeFile(p, data) : fs.writeFile(p, data, 'utf-8'));
const copyFile = (src, dest) => fs.copyFile(src, dest);
const rename = (a, b) => fs.rename(a, b);
const unlink = (p) => fs.unlink(p);
async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}
// 可读性探测：只查权限位、不读正文、不触发云下载（用于快速发现 chmod 000 等）
async function canRead(p) {
  try { await fs.access(p, FS_CONST.R_OK); return true; } catch { return false; }
}

// ---------- 工具 ----------
function withTimeout(promise, ms) {
  if (!ms || ms <= 0) return promise;
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      const e = new Error('read timeout');
      e.__timeout = true;
      reject(e);
    }, ms);
    promise.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

function classifyReason(err) {
  const code = err && err.code;
  if (code === 'EACCES' || code === 'EPERM') return 'permission';
  if (code === 'ENOENT') return 'missing';
  return 'io_error';
}

function buildMarkdown(yamlData, content) {
  const safeYaml = yamlData && typeof yamlData === 'object' ? yamlData : {};
  const safeContent = typeof content === 'string' ? content : '';
  return `---\n${yaml.stringify(safeYaml).trim()}\n---\n${safeContent}`;
}

// ---------- 笔记域：列表 / 读取 / 写入 ----------
async function listFiles(storagePath) {
  let names;
  try { names = await fs.readdir(storagePath); } catch { return []; }
  names.sort();
  const out = [];
  for (const file of names) {
    if (path.extname(file) !== '.md') continue;
    const filePath = path.join(storagePath, file);
    let st;
    try { st = await fs.stat(filePath); } catch { continue; }
    if (!st.isFile()) continue;
    out.push({ file, filePath, mtimeMs: st.mtimeMs, size: st.size, dataless: isDataless(st) });
  }
  return out;
}

// 读一篇笔记：成功返回 { data, content }；不可读返回 { unavailable:true, reason }
async function readNote(filePath, { timeoutMs = DEFAULT_FILE_TIMEOUT_MS } = {}) {
  try {
    const raw = await withTimeout(fs.readFile(filePath, 'utf-8'), timeoutMs);
    const parsed = matter(raw);
    return { data: parsed.data, content: parsed.content };
  } catch (err) {
    if (err && err.__timeout) return { unavailable: true, reason: 'timeout' };
    return { unavailable: true, reason: classifyReason(err) };
  }
}

async function readId(filePath, { timeoutMs = DEFAULT_FILE_TIMEOUT_MS } = {}) {
  const r = await readNote(filePath, { timeoutMs });
  if (r.unavailable) return r;
  const id = normalizeFields(r.data).id;
  return id ? { id } : { unavailable: true, reason: 'io_error' };
}

async function writeNote(filePath, { yaml: yamlData, content }) {
  await fs.writeFile(filePath, buildMarkdown(yamlData, content), 'utf-8');
}

// 给定目标文件名，返回实际文件路径：优先精确命中；否则按 frontmatter id 前缀匹配（带超时）。
// 取代 file.cjs 旧版逐个同步读所有文件的逻辑（那版遇到 dataless 会卡死）。
async function resolveFile(storagePath, fileName, { timeoutMs = DEFAULT_FILE_TIMEOUT_MS } = {}) {
  const target = String(fileName || '');
  if (!target) return null;
  const exact = path.join(storagePath, target);
  if (await exists(exact)) return exact;
  const files = await listFiles(storagePath);
  for (const f of files) {
    if (f.dataless) continue;
    const r = await readId(f.filePath, { timeoutMs });
    if (!r.unavailable && r.id && target.startsWith(`${r.id}-`)) return f.filePath;
  }
  return null;
}

// 文件名 → 已存在的行 id（最长 id 优先，避免 id 互为前缀时误配）
function matchRowByPrefix(file, rows) {
  let best = null;
  for (const r of rows) {
    if (r && r.id && file.startsWith(`${r.id}-`)) {
      if (!best || String(r.id).length > String(best.id).length) best = r;
    }
  }
  return best;
}

// 扫描顶层笔记：只产 I/O 事实，不算 missing（missing 由 planReconcile 纯计算）。
// 产出：notes(可读且新增/变更，含 content) / unchanged(可读且 mtime+size 未变) /
//       unreadable(存在但读不出) / unmatchedFilenames(存在但匹配不到任何行、无法定 id) /
//       skipped(坏文件) / storageUnavailable(目录不可信)
async function scanNotes({
  storagePath, rows = [], concurrency = DEFAULT_CONCURRENCY,
  fileTimeoutMs = DEFAULT_FILE_TIMEOUT_MS, budgetMs = DEFAULT_BUDGET_MS,
} = {}) {
  const result = {
    notes: [], unchanged: [], unreadable: [], unmatchedFilenames: [], skipped: [], storageUnavailable: false,
  };
  let names;
  try { names = await fs.readdir(storagePath); } catch {
    result.storageUnavailable = true;
    return result;
  }
  const mdNames = names.filter((n) => path.extname(n) === '.md').sort();
  // 聚合护栏：目录整体没有 .md → 视为存储挂起，绝不据此判定整库缺失
  if (mdNames.length === 0) {
    result.storageUnavailable = true;
    return result;
  }

  const deadline = Date.now() + budgetMs;
  let consecutiveTimeouts = 0;

  const worker = async (file) => {
    const filePath = path.join(storagePath, file);
    let st;
    try { st = await fs.stat(filePath); } catch (e) { result.skipped.push({ file, reason: e.message }); return; }
    if (!st.isFile()) return;
    const mtime = st.mtimeMs;
    const size = st.size;
    const cand = matchRowByPrefix(file, rows);

    // ① dataless：不读，直接判未下载
    if (isDataless(st)) {
      if (cand) result.unreadable.push({ id: cand.id, file, reason: 'not_downloaded', mtime, size });
      else result.unmatchedFilenames.push(file);
      return;
    }

    // ①.5 权限不可读（chmod 000 等）：access 只查元数据、不读正文，
    // 否则会被下方「mtime+size 未变→跳过读」漏掉，且轮询只 stat 也发现不了
    if (!(await canRead(filePath))) {
      if (cand) result.unreadable.push({ id: cand.id, file, reason: 'permission', mtime, size });
      else result.unmatchedFilenames.push(file);
      return;
    }

    // ② mtime+size 未变：跳过读正文，判可用
    if (cand && cand.mtime != null && cand.size != null
      && Number(cand.mtime) === mtime && Number(cand.size) === size) {
      result.unchanged.push({ id: cand.id, file, mtime, size });
      return;
    }

    // ③ 需要读：预算用尽或连续超时过多则不再发起读
    if (Date.now() > deadline || consecutiveTimeouts >= CONSECUTIVE_TIMEOUT_LIMIT) {
      if (cand) result.unreadable.push({ id: cand.id, file, reason: 'timeout', mtime, size });
      else result.unmatchedFilenames.push(file);
      return;
    }

    let raw;
    try {
      raw = await withTimeout(fs.readFile(filePath, 'utf-8'), fileTimeoutMs);
      consecutiveTimeouts = 0;
    } catch (e) {
      if (e && e.__timeout) {
        consecutiveTimeouts += 1;
        if (cand) result.unreadable.push({ id: cand.id, file, reason: 'timeout', mtime, size });
        else result.unmatchedFilenames.push(file);
      } else if (e && e.code === 'ENOENT') {
        result.skipped.push({ file, reason: '文件已消失' });
      } else if (cand) {
        result.unreadable.push({ id: cand.id, file, reason: classifyReason(e), mtime, size });
      } else {
        result.skipped.push({ file, reason: e.message });
      }
      return;
    }

    const parsed = matter(raw);
    const fields = normalizeFields(parsed.data);
    if (!fields.id) { result.skipped.push({ file, reason: 'frontmatter 缺少 id' }); return; }
    result.notes.push({ ...fields, content: parsed.content, file, mtime, size });
  };

  let idx = 0;
  const runners = Array.from({ length: Math.min(concurrency, mdNames.length) }, async () => {
    while (idx < mdNames.length) {
      const file = mdNames[idx];
      idx += 1;
      await worker(file);
    }
  });
  await Promise.all(runners);
  return result;
}

// 扫描回收站（.delete/）：dataless 直接跳过（读会卡），异常文件忽略。
async function scanTrash({ storagePath, timeoutMs = DEFAULT_FILE_TIMEOUT_MS } = {}) {
  const dir = path.join(storagePath, '.delete');
  const out = [];
  let names;
  try { names = await fs.readdir(dir); } catch { return out; }
  names.sort();
  for (const file of names) {
    if (path.extname(file) !== '.md') continue;
    const filePath = path.join(dir, file);
    let st;
    try { st = await fs.stat(filePath); } catch { continue; }
    if (isDataless(st)) continue;
    try {
      const raw = await withTimeout(fs.readFile(filePath, 'utf-8'), timeoutMs);
      const parsed = matter(raw);
      const fields = normalizeFields(parsed.data);
      if (!fields.id) continue;
      out.push({ ...fields, content: parsed.content, file, lastUpTime: st.mtime.toISOString() });
    } catch {
      // 无法解析/读取的回收站文件跳过，不影响启动
    }
  }
  return out;
}

module.exports = {
  // 通用原语
  stat, readdir, readFile, writeFile, copyFile, rename, unlink, exists, canRead,
  // 笔记域
  listFiles, readNote, readId, writeNote, resolveFile, scanNotes, scanTrash,
  // 工具
  isDataless, buildMarkdown, withTimeout, classifyReason, matchRowByPrefix,
  DEFAULT_CONCURRENCY, DEFAULT_FILE_TIMEOUT_MS, DEFAULT_BUDGET_MS, CONSECUTIVE_TIMEOUT_LIMIT,
};
