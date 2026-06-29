const test = require('node:test')
const assert = require('node:assert/strict')
const {
  normalizeLanguagePreference,
  resolveLanguage,
  getMenuLabels,
} = require('./locale.cjs')

test('invalid preferences normalize to system', () => {
  assert.equal(normalizeLanguagePreference('zh'), 'system')
})

test('system zh-CN resolves to Simplified Chinese', () => {
  assert.equal(resolveLanguage('system', ['zh-CN']), 'zh-CN')
})

test('unsupported system language resolves to English', () => {
  assert.equal(resolveLanguage('system', ['fr-FR']), 'en')
})

test('menu labels exist for both languages', () => {
  assert.equal(getMenuLabels('en').edit, 'Edit')
  assert.equal(getMenuLabels('zh-CN').edit, '编辑')
})
