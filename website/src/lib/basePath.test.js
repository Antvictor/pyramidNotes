import test from 'node:test'
import assert from 'node:assert/strict'

import { joinBasePath, localizedPath, resolveBasePath } from './basePath.js'

globalThis.window = { location: { pathname: '/' } }
globalThis.document = { documentElement: { dataset: { page: 'root' } } }

test('joinBasePath supports root and project paths', () => {
  assert.equal(joinBasePath('/', 'zh/'), '/zh/')
  assert.equal(joinBasePath('/pyramidNotes/', 'zh/'), '/pyramidNotes/zh/')
})

test('localizedPath builds root and localized URLs', () => {
  assert.equal(localizedPath('/pyramidNotes/', 'root'), '/pyramidNotes/')
  assert.equal(localizedPath('/pyramidNotes/', 'en'), '/pyramidNotes/en/')
  assert.equal(localizedPath('/pyramidNotes/', 'zh'), '/pyramidNotes/zh/')
})

test('resolveBasePath detects root and project-path hosting', () => {
  assert.equal(resolveBasePath('/pyramidNotes/', 'root'), '/pyramidNotes/')
  assert.equal(resolveBasePath('/pyramidNotes/en/', 'en'), '/pyramidNotes/')
  assert.equal(resolveBasePath('/zh/', 'zh'), '/')
})
