const { ipcMain, dialog } = require('electron');
const { loadSettings, saveSettings, getCachedSettings, setCachedSettings, DEFAULT_SETTINGS } = require('../common/settings.cjs');

function registerSettingsIPC() {
  ipcMain.handle('getSettings', async () => {
    return getCachedSettings() || DEFAULT_SETTINGS;
  });

  ipcMain.handle('saveSettings', async (event, newSettings) => {
    const currentSettings = getCachedSettings() || DEFAULT_SETTINGS;
    const mergedSettings = { ...currentSettings, ...newSettings };
    return await saveSettings(mergedSettings);
  });

  ipcMain.handle('selectDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });
}

module.exports = { registerSettingsIPC };
