const test = require('node:test')
const assert = require('node:assert/strict')
const {
  normalizeLanguagePreference,
  resolveLanguage,
  getMenuLabels,
  buildApplicationMenuTemplate,
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

test('application menu does not register a select-all accelerator', () => {
  const collect = (items, out = []) => {
    for (const item of items) {
      out.push(item)
      if (Array.isArray(item.submenu)) collect(item.submenu, out)
    }
    return out
  }

  const items = collect(buildApplicationMenuTemplate('en'))
  // 菜单级 CmdOrCtrl+A 会吞掉按键，使 ProseMirror 选区不同步（全选后 Backspace 无效）。
  assert.equal(items.some((item) => item.role === 'selectAll'), false)
})
