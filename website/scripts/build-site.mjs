import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const websiteRoot = path.resolve(__dirname, '..')
const distDir = path.join(websiteRoot, 'dist')

async function removeDirectory(target) {
  await fs.rm(target, { recursive: true, force: true })
}

async function copyDirectory(source, destination, filter = () => true) {
  await fs.mkdir(destination, { recursive: true })
  const entries = await fs.readdir(source, { withFileTypes: true })

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name)
    const destinationPath = path.join(destination, entry.name)

    if (!filter(sourcePath, entry)) {
      continue
    }

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, destinationPath, filter)
      continue
    }

    if (entry.isFile()) {
      await fs.copyFile(sourcePath, destinationPath)
    }
  }
}

await removeDirectory(distDir)
await fs.mkdir(distDir, { recursive: true })

for (const file of ['index.html']) {
  await fs.copyFile(path.join(websiteRoot, file), path.join(distDir, file))
}

for (const directory of ['en', 'zh']) {
  await copyDirectory(path.join(websiteRoot, directory), path.join(distDir, directory))
}

await copyDirectory(path.join(websiteRoot, 'assets'), path.join(distDir, 'assets'))
await copyDirectory(path.join(websiteRoot, 'public'), distDir)
await copyDirectory(
  path.join(websiteRoot, 'src'),
  path.join(distDir, 'src'),
  (sourcePath, entry) => !entry.name.endsWith('.test.js'),
)

console.log(`Built static site into ${distDir}`)
