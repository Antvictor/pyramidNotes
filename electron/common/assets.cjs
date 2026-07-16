const path = require('path')
const { app } = require('electron')

function resolveRuntimeAsset(...segments) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, ...segments)
  }

  return path.join(__dirname, '..', ...segments)
}

function resolveAppIconPath() {
  if (app.isPackaged) {
    return resolveRuntimeAsset('runtime-assets', 'icon.png')
  }

  return resolveRuntimeAsset('build', 'icon.png')
}

module.exports = {
  resolveRuntimeAsset,
  resolveAppIconPath,
}
