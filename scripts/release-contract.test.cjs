const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const {
  TARGETS,
  buildReleaseMetadata,
  choosePrimaryAsset,
  classifyAsset,
  groupAssetsByTarget,
  isPrereleaseTag,
  validateMetadata,
  validateReleaseAssets,
} = require('./release-contract.cjs')

function createReleaseFixture(fileNames) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'release-contract-'))

  for (const fileName of fileNames) {
    const absolutePath = path.join(directory, fileName)
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
    fs.writeFileSync(absolutePath, '')
  }

  return directory
}

test('classifyAsset recognizes macOS and Windows artifacts', () => {
  assert.deepEqual(
    classifyAsset('Pyramid Notes-1.0.0.dmg'),
    {
      id: 'macos-x64-dmg',
      fileName: 'Pyramid Notes-1.0.0.dmg',
      version: '1.0.0',
      kind: 'installer',
      targets: [TARGETS.macosX64],
      sharedKey: null,
    },
  )

  assert.deepEqual(
    classifyAsset('Pyramid Notes Setup 1.0.0.exe'),
    {
      id: 'windows-shared-installer',
      fileName: 'Pyramid Notes Setup 1.0.0.exe',
      version: '1.0.0',
      kind: 'installer',
      targets: [TARGETS.windowsX64, TARGETS.windowsIa32],
      sharedKey: 'windows-shared-installer',
    },
  )

  assert.equal(classifyAsset('unexpected-file.zip'), null)
})

test('classifyAsset recognizes prerelease file names', () => {
  assert.deepEqual(
    classifyAsset('Pyramid Notes-1.0.0-alpha.dmg'),
    {
      id: 'macos-x64-dmg',
      fileName: 'Pyramid Notes-1.0.0-alpha.dmg',
      version: '1.0.0-alpha',
      kind: 'installer',
      targets: [TARGETS.macosX64],
      sharedKey: null,
    },
  )

  assert.deepEqual(
    classifyAsset('Pyramid Notes Setup 1.0.0-alpha.exe'),
    {
      id: 'windows-shared-installer',
      fileName: 'Pyramid Notes Setup 1.0.0-alpha.exe',
      version: '1.0.0-alpha',
      kind: 'installer',
      targets: [TARGETS.windowsX64, TARGETS.windowsIa32],
      sharedKey: 'windows-shared-installer',
    },
  )
})

test('choosePrimaryAsset prefers the installer for a target', () => {
  const installer = {
    fileName: 'Pyramid Notes-1.0.0.dmg',
    relativePath: 'Pyramid Notes-1.0.0.dmg',
    kind: 'installer',
  }
  const archive = {
    fileName: 'Pyramid Notes-1.0.0-mac.zip',
    relativePath: 'Pyramid Notes-1.0.0-mac.zip',
    kind: 'archive',
  }

  assert.equal(choosePrimaryAsset(TARGETS.macosX64, [archive, installer]), installer)
  assert.throws(
    () => choosePrimaryAsset(TARGETS.macosX64, [archive]),
    /Missing primary installer/,
  )
})

test('validateReleaseAssets accepts the current shared Windows installer layout', () => {
  const releaseDir = createReleaseFixture([
    'Pyramid Notes-1.0.0.dmg',
    'Pyramid Notes-1.0.0-mac.zip',
    'Pyramid Notes-1.0.0-arm64.dmg',
    'Pyramid Notes-1.0.0-arm64-mac.zip',
    'Pyramid Notes Setup 1.0.0.exe',
    'Pyramid Notes-1.0.0-win.zip',
    'Pyramid Notes-1.0.0-ia32-win.zip',
    'Pyramid Notes-1.0.0.dmg.blockmap',
    'builder-debug.yml',
    'win-unpacked/Pyramid Notes.exe',
  ])

  const result = validateReleaseAssets({
    releaseDir,
    tag: 'v1.0.0',
    releaseName: 'v1.0.0',
    publishedAt: '2026-06-26T00:00:00.000Z',
  })

  assert.deepEqual(result.errors, [])
  assert.equal(
    result.metadata.targets[TARGETS.windowsX64].fileName,
    'Pyramid Notes Setup 1.0.0.exe',
  )
  assert.equal(
    result.metadata.targets[TARGETS.windowsIa32].fileName,
    'Pyramid Notes Setup 1.0.0.exe',
  )
  assert.equal(
    result.metadata.targets[TARGETS.windowsIa32].assets.some((asset) => asset.fileName === 'Pyramid Notes-1.0.0-ia32-win.zip'),
    true,
  )
})

test('validateReleaseAssets fails when a required target is missing', () => {
  const releaseDir = createReleaseFixture([
    'Pyramid Notes-1.0.0.dmg',
    'Pyramid Notes-1.0.0-mac.zip',
    'Pyramid Notes Setup 1.0.0.exe',
    'Pyramid Notes-1.0.0-win.zip',
    'Pyramid Notes-1.0.0-ia32-win.zip',
  ])

  const result = validateReleaseAssets({
    releaseDir,
    tag: 'v1.0.0',
    publishedAt: '2026-06-26T00:00:00.000Z',
  })

  assert.equal(result.errors.some((error) => error.includes(TARGETS.macosArm64)), true)
})

test('buildReleaseMetadata exposes the minimum schema', () => {
  const asset = (fileName, kind, target) => ({
    fileName,
    kind,
    relativePath: fileName,
    targets: [target],
  })
  const sharedInstaller = {
    fileName: 'Pyramid Notes Setup 1.0.0.exe',
    kind: 'installer',
    relativePath: 'Pyramid Notes Setup 1.0.0.exe',
    targets: [TARGETS.windowsX64, TARGETS.windowsIa32],
  }
  const assetsByTarget = groupAssetsByTarget([
    asset('Pyramid Notes-1.0.0.dmg', 'installer', TARGETS.macosX64),
    asset('Pyramid Notes-1.0.0-mac.zip', 'archive', TARGETS.macosX64),
    asset('Pyramid Notes-1.0.0-arm64.dmg', 'installer', TARGETS.macosArm64),
    asset('Pyramid Notes-1.0.0-arm64-mac.zip', 'archive', TARGETS.macosArm64),
    sharedInstaller,
    asset('Pyramid Notes-1.0.0-win.zip', 'archive', TARGETS.windowsX64),
    asset('Pyramid Notes-1.0.0-ia32-win.zip', 'archive', TARGETS.windowsIa32),
  ])

  const metadata = buildReleaseMetadata({
    tag: 'v1.0.0',
    releaseName: 'v1.0.0',
    publishedAt: '2026-06-26T00:00:00.000Z',
    prerelease: false,
    assetsByTarget,
  })

  assert.equal(metadata.tag, 'v1.0.0')
  assert.equal(metadata.prerelease, false)
  assert.equal(metadata.targets[TARGETS.macosX64].fileName, 'Pyramid Notes-1.0.0.dmg')
  assert.equal(metadata.targets[TARGETS.windowsIa32].url.includes('Pyramid%20Notes%20Setup%201.0.0.exe'), true)
  assert.deepEqual(validateMetadata(metadata), [])
})

test('isPrereleaseTag detects alpha beta and rc tags', () => {
  assert.equal(isPrereleaseTag('v1.0.0'), false)
  assert.equal(isPrereleaseTag('v1.0.0-alpha.1'), true)
  assert.equal(isPrereleaseTag('v1.0.0-beta.2'), true)
  assert.equal(isPrereleaseTag('v1.0.0-rc.1'), true)
})
