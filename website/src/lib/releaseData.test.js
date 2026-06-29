import test from 'node:test'
import assert from 'node:assert/strict'

import {
  detectPlatformFromValues,
  isReleaseMetadata,
  loadReleaseMetadata,
  releasesPageUrl,
} from './releaseData.js'

const validMetadata = {
  tag: 'v1.0.0-alpha',
  name: 'v1.0.0-alpha',
  prerelease: true,
  publishedAt: '2026-06-26T00:00:00.000Z',
  targets: {
    'macos-arm64': { fileName: 'a', url: 'https://example.com/a', kind: 'installer' },
    'macos-x64': { fileName: 'b', url: 'https://example.com/b', kind: 'installer' },
    'windows-x64': { fileName: 'c', url: 'https://example.com/c', kind: 'installer' },
    'windows-ia32': { fileName: 'd', url: 'https://example.com/d', kind: 'installer' },
  },
}

test('detectPlatformFromValues recognizes current target families', () => {
  assert.equal(
    detectPlatformFromValues({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)', platform: 'MacIntel' }),
    'macos-x64',
  )
  assert.equal(
    detectPlatformFromValues({ userAgent: 'Mozilla/5.0 (Macintosh; Apple Silicon)', platform: 'MacIntel', architecture: 'arm64' }),
    'macos-arm64',
  )
  assert.equal(
    detectPlatformFromValues({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', platform: 'Win32' }),
    'windows-x64',
  )
  assert.equal(detectPlatformFromValues({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' }), null)
})

test('isReleaseMetadata validates required target entries', () => {
  assert.equal(isReleaseMetadata(validMetadata), true)
  assert.equal(isReleaseMetadata({}), false)
})

test('loadReleaseMetadata returns parsed payload', async () => {
  const metadata = await loadReleaseMetadata(async () => ({
    ok: true,
    async json() {
      return validMetadata
    },
  }), '/')

  assert.equal(metadata.tag, 'v1.0.0-alpha')
  assert.equal(metadata.prerelease, true)
})

test('loadReleaseMetadata rejects malformed payloads', async () => {
  await assert.rejects(
    () => loadReleaseMetadata(async () => ({
      ok: true,
      async json() {
        return { tag: 'broken' }
      },
    }), '/'),
    /required target entries/,
  )
})

test('releasesPageUrl points to the public releases page', () => {
  assert.equal(releasesPageUrl(), 'https://github.com/Antvictor/pyramidNotes/releases')
})
