const test = require('node:test');
const assert = require('node:assert/strict');
const { buildRecoveryNotice } = require('./recoveryNotice.cjs');

test('buildRecoveryNotice 输出中文文案与备份/数量', () => {
  const notice = buildRecoveryNotice('zh-CN', {
    backupPaths: ['/tmp/.data.corrupt-20261118-090503'],
    nodeCount: 12,
    trashCount: 3,
  });
  assert.equal(notice.title, '数据库已自动恢复');
  assert.match(notice.message, /自动重建/);
  assert.match(notice.detail, /\/tmp\/\.data\.corrupt-20261118-090503/);
  assert.match(notice.detail, /笔记文件：12/);
  assert.match(notice.detail, /回收站条目：3/);
  assert.equal(notice.ok, '好');
});

test('buildRecoveryNotice 输出英文文案', () => {
  const notice = buildRecoveryNotice('en', {
    backupPaths: ['/tmp/.data.corrupt-1'],
    nodeCount: 7,
    trashCount: 0,
  });
  assert.equal(notice.title, 'Database recovered');
  assert.match(notice.detail, /Note files: 7/);
  assert.match(notice.detail, /Trash entries: 0/);
  assert.equal(notice.ok, 'OK');
});

test('buildRecoveryNotice 对未知语言回退英文并容忍缺参', () => {
  const notice = buildRecoveryNotice('fr');
  assert.equal(notice.title, 'Database recovered');
  assert.match(notice.detail, /\(none\)/);
  assert.match(notice.detail, /Note files: 0/);
});
