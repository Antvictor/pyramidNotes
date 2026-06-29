const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

test('sandboxed preload does not require local CommonJS modules', () => {
  const preloadPath = path.join(__dirname, '..', 'preload.cjs')
  const source = fs.readFileSync(preloadPath, 'utf8')
  assert.doesNotMatch(source, /require\(['"]\.\//)
})
