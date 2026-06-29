const TARGETS = {
  macosX64: 'macos-x64',
  macosArm64: 'macos-arm64',
  windowsX64: 'windows-x64',
  windowsIa32: 'windows-ia32',
}

const TARGET_ORDER = [
  TARGETS.macosX64,
  TARGETS.macosArm64,
  TARGETS.windowsX64,
  TARGETS.windowsIa32,
]

const DEFAULT_REPOSITORY = 'Antvictor/pyramidNotes'
const VERSION_PATTERN = '\\d+\\.\\d+\\.\\d+(?:-(?:alpha|beta|rc)[0-9A-Za-z.-]*)?'
const PRODUCT_PATTERN = 'Pyramid[ .]Notes'
const SETUP_PATTERN = 'Pyramid[ .]Notes[ .]Setup'

const FILE_PATTERNS = [
  {
    name: 'macos-arm64-dmg',
    regex: new RegExp(`^${PRODUCT_PATTERN}-(${VERSION_PATTERN})-arm64\\.dmg$`),
    kind: 'installer',
    targets: [TARGETS.macosArm64],
  },
  {
    name: 'macos-x64-dmg',
    regex: new RegExp(`^${PRODUCT_PATTERN}-(${VERSION_PATTERN})\\.dmg$`),
    kind: 'installer',
    targets: [TARGETS.macosX64],
  },
  {
    name: 'macos-arm64-zip',
    regex: new RegExp(`^${PRODUCT_PATTERN}-(${VERSION_PATTERN})-arm64-mac\\.zip$`),
    kind: 'archive',
    targets: [TARGETS.macosArm64],
  },
  {
    name: 'macos-x64-zip',
    regex: new RegExp(`^${PRODUCT_PATTERN}-(${VERSION_PATTERN})-mac\\.zip$`),
    kind: 'archive',
    targets: [TARGETS.macosX64],
  },
  {
    name: 'windows-shared-installer',
    regex: new RegExp(`^${SETUP_PATTERN}[ .](${VERSION_PATTERN})\\.exe$`),
    kind: 'installer',
    targets: [TARGETS.windowsX64, TARGETS.windowsIa32],
  },
  {
    name: 'windows-ia32-zip',
    regex: new RegExp(`^${PRODUCT_PATTERN}-(${VERSION_PATTERN})-ia32-win\\.zip$`),
    kind: 'archive',
    targets: [TARGETS.windowsIa32],
  },
  {
    name: 'windows-x64-zip',
    regex: new RegExp(`^${PRODUCT_PATTERN}-(${VERSION_PATTERN})-win\\.zip$`),
    kind: 'archive',
    targets: [TARGETS.windowsX64],
  },
]

export function classifyAsset(fileName) {
  for (const pattern of FILE_PATTERNS) {
    const match = fileName.match(pattern.regex)
    if (!match) {
      continue
    }

    return {
      id: pattern.name,
      fileName,
      version: match[1],
      kind: pattern.kind,
      targets: [...pattern.targets],
    }
  }

  return null
}

export function isPrereleaseTag(tag) {
  return /-(alpha|beta|rc)(?:[.-]|$)/i.test(tag)
}

function uniqueById(assets) {
  const seen = new Set()
  return assets.filter((asset) => {
    const key = asset.relativePath
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

export function groupAssetsByTarget(recognizedAssets) {
  const assetsByTarget = Object.fromEntries(TARGET_ORDER.map((target) => [target, []]))

  for (const asset of recognizedAssets) {
    for (const target of asset.targets) {
      assetsByTarget[target].push(asset)
    }
  }

  return assetsByTarget
}

function choosePrimaryAsset(targetKey, assets) {
  const installers = uniqueById(assets).filter((asset) => asset.kind === 'installer')
  if (installers.length === 0) {
    throw new Error(`Missing primary installer for ${targetKey}`)
  }
  if (installers.length > 1) {
    throw new Error(
      `Ambiguous primary installer for ${targetKey}: ${installers.map((asset) => asset.fileName).join(', ')}`,
    )
  }
  return installers[0]
}

export function validateAssetsByTarget(assetsByTarget) {
  const errors = []

  for (const targetKey of TARGET_ORDER) {
    const targetAssets = uniqueById(assetsByTarget[targetKey] || [])
    if (targetAssets.length === 0) {
      errors.push(`Missing assets for ${targetKey}`)
      continue
    }

    const installers = targetAssets.filter((asset) => asset.kind === 'installer')
    if (installers.length === 0) {
      errors.push(`Missing installer for ${targetKey}`)
    }
    if (installers.length > 1) {
      errors.push(
        `Multiple installers for ${targetKey}: ${installers.map((asset) => asset.fileName).join(', ')}`,
      )
    }

    const archives = targetAssets.filter((asset) => asset.kind === 'archive')
    if (archives.length > 1) {
      errors.push(
        `Multiple archives for ${targetKey}: ${archives.map((asset) => asset.fileName).join(', ')}`,
      )
    }
  }

  return errors
}

function toPublishedAssetName(fileName) {
  return fileName.replaceAll(' ', '.')
}

function buildDownloadUrl(repository, tag, fileName) {
  const encodedFileName = encodeURIComponent(toPublishedAssetName(fileName))
  return `https://github.com/${repository}/releases/download/${encodeURIComponent(tag)}/${encodedFileName}`
}

function resolveAssetDownloadUrl(asset, repository, tag) {
  if (asset.url) {
    return asset.url
  }

  return buildDownloadUrl(repository, tag, asset.fileName)
}

function toTargetEntry(targetKey, assets, repository, tag) {
  const uniqueAssets = uniqueById(assets)
  const primaryAsset = choosePrimaryAsset(targetKey, uniqueAssets)

  return {
    fileName: toPublishedAssetName(primaryAsset.fileName),
    url: resolveAssetDownloadUrl(primaryAsset, repository, tag),
    kind: primaryAsset.kind,
    assets: uniqueAssets.map((asset) => ({
      fileName: toPublishedAssetName(asset.fileName),
      url: resolveAssetDownloadUrl(asset, repository, tag),
      kind: asset.kind,
      primary: asset.relativePath === primaryAsset.relativePath,
    })),
  }
}

export function buildReleaseMetadata({
  tag,
  releaseName,
  publishedAt,
  prerelease,
  assetsByTarget,
  repository = DEFAULT_REPOSITORY,
}) {
  return {
    tag,
    name: releaseName,
    prerelease,
    publishedAt,
    targets: {
      [TARGETS.macosX64]: toTargetEntry(TARGETS.macosX64, assetsByTarget[TARGETS.macosX64], repository, tag),
      [TARGETS.macosArm64]: toTargetEntry(TARGETS.macosArm64, assetsByTarget[TARGETS.macosArm64], repository, tag),
      [TARGETS.windowsX64]: toTargetEntry(TARGETS.windowsX64, assetsByTarget[TARGETS.windowsX64], repository, tag),
      [TARGETS.windowsIa32]: toTargetEntry(TARGETS.windowsIa32, assetsByTarget[TARGETS.windowsIa32], repository, tag),
    },
  }
}

export function validateMetadata(metadata) {
  const errors = []

  if (!metadata || typeof metadata !== 'object') {
    return ['Metadata payload is missing']
  }

  for (const field of ['tag', 'name', 'publishedAt']) {
    if (!metadata[field]) {
      errors.push(`Missing metadata field: ${field}`)
    }
  }

  if (typeof metadata.prerelease !== 'boolean') {
    errors.push('Metadata field "prerelease" must be boolean')
  }

  if (!metadata.targets || typeof metadata.targets !== 'object') {
    errors.push('Missing metadata field: targets')
    return errors
  }

  for (const targetKey of TARGET_ORDER) {
    const entry = metadata.targets[targetKey]
    if (!entry) {
      errors.push(`Missing metadata target entry: ${targetKey}`)
      continue
    }

    if (!entry.fileName) {
      errors.push(`Missing metadata field: targets.${targetKey}.fileName`)
    }
    if (!entry.url) {
      errors.push(`Missing metadata field: targets.${targetKey}.url`)
    }
  }

  return errors
}
