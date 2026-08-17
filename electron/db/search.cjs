const { Worker } = require('worker_threads');
const path = require('path');

const SEARCH_TIMEOUT_MS = 3000;

let cached = null; // { dbPath, worker, pending: Map<reqId, {resolve, reject, timer}> }
let nextReqId = 0;

function getWorker(dbPath, extensionPath) {
  if (cached && cached.dbPath === dbPath) return cached;
  reset();
  const worker = new Worker(path.join(__dirname, 'searchWorker.cjs'), {
    workerData: { dbPath, extensionPath },
  });
  const pending = new Map();
  cached = { dbPath, worker, pending };
  worker.on('message', (msg) => {
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    clearTimeout(p.timer);
    if (msg.error) p.reject(new Error(msg.error));
    else p.resolve(msg.result);
  });
  worker.on('error', (err) => {
    for (const [, p] of pending) { clearTimeout(p.timer); p.reject(err); }
    pending.clear();
    cached = null;
  });
  return cached;
}

function search(keyword, dbPath, extensionPath) {
  const { worker, pending } = getWorker(dbPath, extensionPath);
  const id = ++nextReqId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      worker.terminate();
      cached = null;
      reject(new Error('search timeout'));
    }, SEARCH_TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer });
    worker.postMessage({ id, keyword });
  });
}

function reset() {
  if (!cached) return;
  cached.worker.terminate();
  for (const [, p] of cached.pending) { clearTimeout(p.timer); p.reject(new Error('search reset')); }
  cached = null;
}

module.exports = { search, reset };
