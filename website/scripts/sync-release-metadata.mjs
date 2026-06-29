import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildReleaseMetadata,
  classifyAsset,
  groupAssetsByTarget,
  isPrereleaseTag,
  validateAssetsByTarget,
  validateMetadata,
} from './release-contract.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '../public')
const outputPath = path.join(publicDir, 'release-metadata.json')
const repository = process.env.GITHUB_REPOSITORY || 'Antvictor/pyramidNotes'
const preferPrerelease = process.env.SITE_RELEASE_CHANNEL !== 'stable'
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

function selectRelease(releases) {
  const candidates = releases.filter((release) => !release.draft)
  if (preferPrerelease) {
    return candidates[0] || null
  }
  return candidates.find((release) => !release.prerelease) || candidates[0] || null
}

function looksLikePublishableAsset(fileName) {
  return /\.(dmg|zip|exe)$/i.test(fileName)
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
    repository,
  })
  const metadataErrors = validateMetadata(metadata)

  if (metadataErrors.length > 0) {
    throw new Error(metadataErrors.join('; '))
  }

  return metadata
}

async function main() {
  const releases = await fetchJson(`https://api.github.com/repos/${repository}/releases?per_page=10`)
  const selectedRelease = selectRelease(releases)

  if (!selectedRelease) {
    throw new Error('No public releases found')
  }

  const metadata = buildMetadataFromRelease(selectedRelease)
  await fs.mkdir(publicDir, { recursive: true })
  await fs.writeFile(outputPath, `${JSON.stringify(metadata, null, 2)}\n`)
  console.log(`Synced release metadata from ${selectedRelease.tag_name}`)
}

await main()
