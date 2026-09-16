const test = require('node:test');
const assert = require('node:assert/strict');
const { extractImageRefs, pickUnreferenced } = require('./attachmentRefs.cjs');

test('extracts local image refs', () => {
  const c = '前文\n\n![[苹果App上架-003.png]]\n\n后文 ![[a-001.jpg]]';
  assert.deepEqual([...extractImageRefs(c)].sort(), ['a-001.jpg', '苹果App上架-003.png']);
});

test('ignores node embeds that are not images', () => {
  // ![[...]] 也用于节点嵌入（InternalNodeLink），无图片扩展名的要排除
  const c = '![[FZcPgIGrovV5]] and ![[某节点名]] and ![[real-001.png]]';
  assert.deepEqual([...extractImageRefs(c)], ['real-001.png']);
});

test('ignores remote markdown images', () => {
  assert.equal(extractImageRefs('![](https://x.com/a.png)').size, 0);
});

test('handles empty / null content', () => {
  assert.equal(extractImageRefs('').size, 0);
  assert.equal(extractImageRefs(null).size, 0);
  assert.equal(extractImageRefs(undefined).size, 0);
});

test('is case-insensitive on extension', () => {
  assert.deepEqual([...extractImageRefs('![[A-001.PNG]]')], ['A-001.PNG']);
});

test('pickUnreferenced returns only files not referenced', () => {
  const files = ['a-001.png', 'b-001.png', 'c-001.png'];
  const referenced = new Set(['b-001.png']);
  assert.deepEqual(pickUnreferenced(files, referenced).sort(), ['a-001.png', 'c-001.png']);
});

test('pickUnreferenced keeps everything when all referenced', () => {
  const files = ['a-001.png'];
  assert.deepEqual(pickUnreferenced(files, new Set(['a-001.png'])), []);
});
