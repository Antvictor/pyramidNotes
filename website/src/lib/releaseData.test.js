import test from 'node:test'
import assert from 'node:assert/strict'

import {
  detectPlatformFromValues,
  fetchLatestReleaseMetadata,
  isReleaseMetadata,
  loadReleaseMetadata,
  releasesPageUrl,
  resolveReleaseState,
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

test('fetchLatestReleaseMetadata converts the newest prerelease release payload', async () => {
  const metadata = await fetchLatestReleaseMetadata(async () => ({
    ok: true,
    async json() {
      return [
        {
          tag_name: 'v1.0.0-alpha.2',
          name: 'v1.0.0-alpha.2',
          prerelease: true,
          draft: false,
          published_at: '2026-07-01T00:00:00.000Z',
          assets: [
            { name: 'Pyramid.Notes-1.0.0-alpha.2.dmg', browser_download_url: 'https://example.com/mac-x64.dmg' },
            { name: 'Pyramid.Notes-1.0.0-alpha.2-mac.zip', browser_download_url: 'https://example.com/mac-x64.zip' },
            { name: 'Pyramid.Notes-1.0.0-alpha.2-arm64.dmg', browser_download_url: 'https://example.com/mac-arm64.dmg' },
            { name: 'Pyramid.Notes-1.0.0-alpha.2-arm64-mac.zip', browser_download_url: 'https://example.com/mac-arm64.zip' },
            { name: 'Pyramid.Notes.Setup.1.0.0-alpha.2.exe', browser_download_url: 'https://example.com/win-setup.exe' },
            { name: 'Pyramid.Notes-1.0.0-alpha.2-win.zip', browser_download_url: 'https://example.com/win-x64.zip' },
            { name: 'Pyramid.Notes-1.0.0-alpha.2-ia32-win.zip', browser_download_url: 'https://example.com/win-ia32.zip' },
          ],
        },
        {
          tag_name: 'v1.0.0-alpha.1',
          name: 'v1.0.0-alpha.1',
          prerelease: true,
          draft: false,
          published_at: '2026-06-30T00:00:00.000Z',
          assets: [],
        },
      ]
    },
  }))

  assert.equal(metadata.tag, 'v1.0.0-alpha.2')
  assert.equal(metadata.targets['macos-x64'].url, 'https://example.com/mac-x64.dmg')
  assert.equal(metadata.targets['windows-ia32'].url, 'https://example.com/win-setup.exe')
})

test('resolveReleaseState falls back to static metadata when GitHub release fetch fails', async () => {
  const calls = []
  const state = await resolveReleaseState(async (url) => {
    calls.push(url)
    if (String(url).includes('/repos/Antvictor/pyramidNotes/releases')) {
      throw new Error('GitHub unavailable')
    }

    return {
      ok: true,
      async json() {
        return validMetadata
      },
    }
  })

  assert.equal(state.kind, 'ready')
  assert.equal(state.metadata.tag, 'v1.0.0-alpha')
  assert.equal(calls.length, 2)
})

test('releasesPageUrl points to the public releases page', () => {
  assert.equal(releasesPageUrl(), 'https://github.com/Antvictor/pyramidNotes/releases')
})
