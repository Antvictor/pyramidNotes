import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const websiteRoot = path.resolve(__dirname, '..')
const requestedRoot = process.argv[2] || '.'
const requestedPort = Number(process.argv[3] || 4173)
const siteRoot = path.resolve(websiteRoot, requestedRoot)

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm',
}

function contentTypeFor(filePath) {
  return mimeTypes[path.extname(filePath)] || 'application/octet-stream'
}

function resolveFilePath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0])
  let relativePath = cleanPath.replace(/^\//, '')

  if (!relativePath) {
    relativePath = 'index.html'
  }

  if (relativePath.endsWith('/')) {
    relativePath = path.join(relativePath, 'index.html')
  }

  return path.join(siteRoot, relativePath)
}

const server = http.createServer(async (request, response) => {
  try {
    let filePath = resolveFilePath(request.url || '/')
    let stats

    try {
      stats = await fs.stat(filePath)
    } catch {
      stats = null
    }

    if (stats?.isDirectory()) {
      filePath = path.join(filePath, 'index.html')
    }

    const contents = await fs.readFile(filePath)
    response.writeHead(200, { 'Content-Type': contentTypeFor(filePath) })
    response.end(contents)
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Not Found')
  }
})

server.listen(requestedPort, '127.0.0.1', () => {
  console.log(`Serving ${siteRoot} at http://127.0.0.1:${requestedPort}`)
})
