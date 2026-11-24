const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  scanNotes, scanTrash, withTimeout, classifyReason, matchRowByPrefix,
} = require('../source/noteRepository.cjs');

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pn-repo-'));
const write = (dir, file, body) => fs.writeFileSync(path.join(dir, file), body, 'utf-8');

test('scanNotes 读取普通 .md，产出 notes 事实', async () => {
  const dir = tmpDir();
  write(dir, 'a1-A.md', '---\nid: a1\ntitle: A\ntop: "1"\n---\n正文A\n');
  write(dir, 'b2-B.md', '---\nid: b2\ntitle: B\ntop: a1\n---\n正文B\n');
  const r = await scanNotes({ storagePath: dir });
  assert.equal(r.storageUnavailable, false);
  assert.deepEqual(r.notes.map((n) => n.id).sort(), ['a1', 'b2']);
  const a = r.notes.find((n) => n.id === 'a1');
  assert.equal(a.content.trim(), '正文A');
  assert.equal(a.name, 'A');
  assert.equal(typeof a.mtime, 'number');
  assert.equal(typeof a.size, 'number');
});

test('scanNotes mtime+size 未变则跳过读正文，归入 unchanged', async () => {
  const dir = tmpDir();
  const p = path.join(dir, 'n1-N1.md');
  fs.writeFileSync(p, '---\nid: n1\ntitle: N1\ntop: "1"\n---\nbody\n', 'utf-8');
  const st = fs.statSync(p);
  const rows = [{ id: 'n1', mtime: st.mtimeMs, size: st.size }];
  const r = await scanNotes({ storagePath: dir, rows });
  assert.deepEqual(r.unchanged.map((u) => u.id), ['n1']);
  assert.equal(r.notes.length, 0);
});

test('scanNotes 目录不存在或整目录无 .md 时判定 storageUnavailable', async () => {
  const missing = await scanNotes({ storagePath: path.join(tmpDir(), 'nope') });
  assert.equal(missing.storageUnavailable, true);

  const empty = tmpDir();
  write(empty, 'readme.txt', 'x');
  const r = await scanNotes({ storagePath: empty });
  assert.equal(r.storageUnavailable, true);
});

test('scanNotes 跳过缺少 frontmatter id 的文件', async () => {
  const dir = tmpDir();
  write(dir, 'good.md', '---\nid: g1\ntitle: G\ntop: "1"\n---\nbody\n');
  write(dir, 'bad.md', '---\ntitle: 无id\n---\nbody\n');
  const r = await scanNotes({ storagePath: dir });
  assert.deepEqual(r.notes.map((n) => n.id), ['g1']);
  assert.equal(r.skipped.length, 1);
  assert.equal(r.skipped[0].file, 'bad.md');
});

test('scanTrash 读取 .delete 下的 md，跳过 dataless/坏文件', async () => {
  const dir = tmpDir();
  const trash = path.join(dir, '.delete');
  fs.mkdirSync(trash, { recursive: true });
  write(trash, 'n1-a.md', '---\nid: "n1"\ntitle: "A"\ntop: "1"\nsort: 3\n---\nhello\n');
  write(trash, 'bad.md', 'no frontmatter id');
  const out = await scanTrash({ storagePath: dir });
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'n1');
  assert.equal(out[0].content.trim(), 'hello');
  assert.match(out[0].lastUpTime, /^\d{4}-\d{2}-\d{2}T/);
});

test('withTimeout 对永不 resolve 的 promise 抛超时', async () => {
  await assert.rejects(
    withTimeout(new Promise(() => {}), 40),
    (e) => e && e.__timeout === true,
  );
});

test('classifyReason 归类错误码', () => {
  assert.equal(classifyReason({ code: 'EACCES' }), 'permission');
  assert.equal(classifyReason({ code: 'EPERM' }), 'permission');
  assert.equal(classifyReason({ code: 'ENOENT' }), 'missing');
  assert.equal(classifyReason({ code: 'EIO' }), 'io_error');
});

test('matchRowByPrefix 取最长 id，避免 id 互为前缀误配', () => {
  const rows = [{ id: 'a' }, { id: 'a-b' }];
  assert.equal(matchRowByPrefix('a-b-x.md', rows).id, 'a-b');
  assert.equal(matchRowByPrefix('a-z.md', rows).id, 'a');
  assert.equal(matchRowByPrefix('zzz.md', rows), null);
});
