const test = require('node:test');
const assert = require('node:assert/strict');
const { shouldRebuildFts } = require('./ftsSync.cjs');

test('new index + empty library → no rebuild', () => {
  assert.equal(shouldRebuildFts({ hadFts: false, notesCount: 0, ftsCount: 0 }), false);
});

test('new index + existing rows → rebuild (triggers cannot backfill history)', () => {
  assert.equal(shouldRebuildFts({ hadFts: false, notesCount: 42, ftsCount: 0 }), true);
});

test('existing index + equal counts → no rebuild', () => {
  assert.equal(shouldRebuildFts({ hadFts: true, notesCount: 42, ftsCount: 42 }), false);
});

test('existing index + both empty → no rebuild', () => {
  assert.equal(shouldRebuildFts({ hadFts: true, notesCount: 0, ftsCount: 0 }), false);
});

test('existing index + count mismatch → rebuild', () => {
  assert.equal(shouldRebuildFts({ hadFts: true, notesCount: 42, ftsCount: 40 }), true);
  assert.equal(shouldRebuildFts({ hadFts: true, notesCount: 40, ftsCount: 42 }), true);
});
