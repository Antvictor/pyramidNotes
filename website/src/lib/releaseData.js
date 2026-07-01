import { resolveBasePath, joinBasePath } from './basePath.js'
import { supportedTargets } from '../content/siteContent.js'
import {
  buildReleaseMetadata,
  classifyAsset,
  groupAssetsByTarget,
  isPrereleaseTag,
  validateAssetsByTarget,
  validateMetadata,
} from '../../scripts/release-contract.mjs'

const RELEASES_API_URL = 'https://api.github.com/repos/Antvictor/pyramidNotes/releases?per_page=10'

export function isReleaseMetadata(value) {
  if (!value || typeof value !== 'object' || typeof value.targets !== 'object') {
    return false
  }

  return supportedTargets.every((target) => {
    const entry = value.targets[target]
    return entry && typeof entry.fileName === 'string' && typeof entry.url === 'string'
  })
}

export function detectPlatformFromValues({ userAgent = '', platform = '', architecture = '' } = {}) {
  const ua = userAgent.toLowerCase()
  const platformValue = platform.toLowerCase()
  const architectureValue = architecture.toLowerCase()

  if (platformValue.includes('win') || ua.includes('windows')) {
    return 'windows-x64'
  }

  if (platformValue.includes('mac') || ua.includes('mac os')) {
    if (
      architectureValue.includes('arm') ||
      architectureValue.includes('apple') ||
      ua.includes('apple silicon') ||
      ua.includes('arm64')
    ) {
      return 'macos-arm64'
    }
    return 'macos-x64'
  }

  return null
}

export async function detectPlatform() {
  if (typeof navigator === 'undefined') {
    return null
  }

  const userAgent = navigator.userAgent || ''
  const platform = navigator.platform || navigator.userAgentData?.platform || ''
  let architecture = ''

  if (navigator.userAgentData?.getHighEntropyValues) {
    try {
      const values = await navigator.userAgentData.getHighEntropyValues(['architecture'])
      architecture = values.architecture || ''
    } catch {
      architecture = ''
    }
  }

  return detectPlatformFromValues({ userAgent, platform, architecture })
}

export function releasesPageUrl() {
  return 'https://github.com/Antvictor/pyramidNotes/releases'
}

function looksLikePublishableAsset(fileName) {
  return /\.(dmg|zip|exe)$/i.test(fileName)
}

function selectLatestRelease(releases) {
  const candidates = releases.filter((release) => !release.draft)
  return candidates[0] || null
}

function buildMetadataFromRelease(selectedRelease) {
  const recognizedAssets = []
  const unknownPublishableFiles = []

  for (const asset of selectedRelease.assets || []) {
    const classification = classifyAsset(asset.name)
    if (classification) {
      recognizedAssets.push({
        ...classification,
        relativePath: asset.name,
        absolutePath: asset.name,
        url: asset.browser_download_url,
      })
      continue
    }

    if (looksLikePublishableAsset(asset.name)) {
      unknownPublishableFiles.push(asset.name)
    }
  }

  const assetsByTarget = groupAssetsByTarget(recognizedAssets)
  const errors = [
    ...unknownPublishableFiles.map((fileName) => `Unknown publishable asset: ${fileName}`),
    ...validateAssetsByTarget(assetsByTarget),
  ]

  if (errors.length > 0) {
    throw new Error(errors.join('; '))
  }

  const metadata = buildReleaseMetadata({
    tag: selectedRelease.tag_name,
    releaseName: selectedRelease.name || selectedRelease.tag_name,
    publishedAt: selectedRelease.published_at || new Date().toISOString(),
    prerelease: typeof selectedRelease.prerelease === 'boolean'
      ? selectedRelease.prerelease
      : isPrereleaseTag(selectedRelease.tag_name),
    assetsByTarget,
  })

  const metadataErrors = validateMetadata(metadata)
  if (metadataErrors.length > 0) {
    throw new Error(metadataErrors.join('; '))
  }

  return metadata
}

export async function loadReleaseMetadata(fetchImpl = fetch, basePath) {
  const resolvedBasePath = basePath ?? (
    typeof window === 'undefined' ? '/' : resolveBasePath()
  )
  const metadataUrl = joinBasePath(resolvedBasePath, 'release-metadata.json')
  const response = await fetchImpl(metadataUrl, { cache: 'no-store' })

  if (!response.ok) {
    throw new Error(`Metadata request failed with status ${response.status}`)
  }

  const json = await response.json()
  if (!isReleaseMetadata(json)) {
    throw new Error('Metadata payload is missing required target entries')
  }

  return json
}

export async function fetchLatestReleaseMetadata(fetchImpl = fetch) {
  const response = await fetchImpl(RELEASES_API_URL, {
    cache: 'no-store',
    headers: {
      Accept: 'application/vnd.github+json',
    },
  })

  if (!response.ok) {
    throw new Error(`GitHub release request failed with status ${response.status}`)
  }

  const releases = await response.json()
  if (!Array.isArray(releases)) {
    throw new Error('GitHub release payload is not an array')
  }

  const selectedRelease = selectLatestRelease(releases)
  if (!selectedRelease) {
    throw new Error('No public releases found')
  }

  return buildMetadataFromRelease(selectedRelease)
}

export async function resolveReleaseState(fetchImpl = fetch) {
  try {
    const metadata = await fetchLatestReleaseMetadata(fetchImpl)
    const recommendedTarget = await detectPlatform()
    return {
      kind: 'ready',
      metadata,
      recommendedTarget,
    }
  } catch {
    try {
      const metadata = await loadReleaseMetadata(fetchImpl)
      const recommendedTarget = await detectPlatform()
      return {
        kind: 'ready',
        metadata,
        recommendedTarget,
      }
    } catch (error) {
      return {
        kind: 'fallback',
        metadata: null,
        recommendedTarget: null,
        error,
      }
    }
  }
}
