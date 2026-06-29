export function resolveBasePath(pathname = window.location.pathname, page = document.documentElement.dataset.page || 'root') {
  const normalizedPath = pathname.endsWith('index.html')
    ? pathname.slice(0, -'index.html'.length)
    : pathname

  if (page === 'root') {
    return normalizedPath.endsWith('/') ? normalizedPath : `${normalizedPath}/`
  }

  const marker = `/${page}/`
  const markerIndex = normalizedPath.lastIndexOf(marker)
  if (markerIndex >= 0) {
    return normalizedPath.slice(0, markerIndex + 1)
  }

  return '/'
}

export function joinBasePath(basePath, relativePath) {
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`
  const normalizedRelative = relativePath.replace(/^\//, '')
  return new URL(normalizedRelative, `https://example.test${normalizedBase}`).pathname
}

export function localizedPath(basePath, locale) {
  if (locale === 'root') {
    return joinBasePath(basePath, '')
  }
  return joinBasePath(basePath, `${locale}/`)
}
