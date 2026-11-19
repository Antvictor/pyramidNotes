const { app, ipcMain } = require('electron');
const path = require('path');
const { resolveStoragePath, classifyError } = require('../common/utils/fileHelper');
const { PLUGIN_API_VERSION } = require('../common/pluginManifest.cjs');
const { scanPlugins, readPlugin } = require('../common/pluginScanner.cjs');

function pluginRoots() {
  return {
    officialRoot: path.join(app.getPath('userData'), 'plugins'),
    userRoot: path.join(resolveStoragePath(), 'plugins'),
  };
}

function registerPluginsIPC() {
  ipcMain.handle('plugins:list', async () => {
    try {
      return scanPlugins({ ...pluginRoots(), hostApiVersion: PLUGIN_API_VERSION });
    } catch (error) {
      console.error('plugins:list failed:', error);
      return { plugins: [], warnings: [], error: classifyError(error) };
    }
  });

  ipcMain.handle('plugins:read', async (_event, id) => {
    try {
      return readPlugin({ id, ...pluginRoots(), hostApiVersion: PLUGIN_API_VERSION });
    } catch (error) {
      console.error('plugins:read failed:', error);
      return { error: classifyError(error) };
    }
  });
}

module.exports = { registerPluginsIPC };
