const fs = require('node:fs')
const path = require('node:path')
const {
  TARGET_ORDER,
  validateReleaseAssets,
} = require('./release-contract.cjs')

function parseArgs(argv) {
  const args = {}

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) {
      continue
    }

    const key = token.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith('--')) {
      args[key] = 'true'
      continue
    }

    args[key] = next
    index += 1
  }

  return args
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

const args = parseArgs(process.argv.slice(2))
const releaseDir = args['release-dir']
const tag = args.tag
const releaseName = args['release-name'] || tag
const repository = args.repo || process.env.GITHUB_REPOSITORY || undefined
const publishedAt = args['published-at'] || new Date().toISOString()

if (!releaseDir) {
  fail('Missing required argument: --release-dir')
}

if (!tag) {
  fail('Missing required argument: --tag')
}

const absoluteReleaseDir = path.resolve(releaseDir)
if (!fs.existsSync(absoluteReleaseDir)) {
  fail(`Release directory does not exist: ${absoluteReleaseDir}`)
}

const result = validateReleaseAssets({
  releaseDir: absoluteReleaseDir,
  tag,
  releaseName,
  repository,
  publishedAt,
})

if (result.errors.length > 0) {
  for (const error of result.errors) {
    console.error(`ERROR: ${error}`)
  }
  process.exit(1)
}

for (const targetKey of TARGET_ORDER) {
  const entry = result.metadata.targets[targetKey]
  console.log(`${targetKey}: ${entry.fileName}`)
}
