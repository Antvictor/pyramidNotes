import { resolveBasePath, joinBasePath } from './basePath.js'
import { supportedTargets } from '../content/siteContent.js'

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

export async function loadReleaseMetadata(fetchImpl = fetch, basePath = resolveBasePath()) {
  const metadataUrl = joinBasePath(basePath, 'release-metadata.json')
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

export async function resolveReleaseState(fetchImpl = fetch) {
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
