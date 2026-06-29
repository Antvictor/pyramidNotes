const { ipcMain, dialog, BrowserWindow } = require('electron');
const { loadSettings, saveSettings, getCachedSettings, setCachedSettings, DEFAULT_SETTINGS } = require('../common/settings.cjs');
const { closeDatabase, initializeDatabase } = require('../db/db.cjs');
const { initNode } = require('../nodes/initNode');
const { applyApplicationMenu } = require('../common/locale.cjs');

function registerSettingsIPC() {
  ipcMain.handle('getSettings', async () => {
    return getCachedSettings() || DEFAULT_SETTINGS;
  });

  ipcMain.handle('saveSettings', async (event, newSettings) => {
    const currentSettings = getCachedSettings() || DEFAULT_SETTINGS;
    const mergedSettings = { ...currentSettings, ...newSettings };

    // Check if storagePath changed
    const oldStoragePath = currentSettings.storagePath;
    const storagePathChanged = newSettings.storagePath && newSettings.storagePath !== oldStoragePath;

    const result = await saveSettings(mergedSettings);

    // Notify all windows about the change
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('settings-changed', mergedSettings);
    });

    if (result && newSettings.language !== undefined) {
      applyApplicationMenu(mergedSettings.language);
    }

    // If storagePath changed, close old DB, re-init at new path, and re-scan
    if (result && storagePathChanged) {
      try {
        console.log('Storage path changed from', oldStoragePath, 'to', mergedSettings.storagePath);
        closeDatabase();
        await initializeDatabase(mergedSettings.storagePath);
        await initNode();
        console.log('Database reloaded for new storage path');
      } catch (err) {
        console.error('Failed to reload database:', err);
      }
    }

    return result;
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
