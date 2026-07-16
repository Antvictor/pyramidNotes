const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const { registerFileIPC } = require('./ipc/file.cjs')
const { registerPathIPC } = require('./ipc/userPath.cjs')
const { createWindow } = require('./window/window.cjs')
const { initializeDatabase, closeDatabase } = require('./db/db.cjs')
const { initNode } = require('./nodes/initNode')
const { loadSettings, getCachedSettings } = require('./common/settings.cjs')
const { resolveAppIconPath } = require('./common/assets.cjs')
const { registerSettingsIPC } = require('./ipc/settings.cjs')
const { registerCaptureIPC } = require('./ipc/capture.cjs')
const { applyApplicationMenu } = require('./common/locale.cjs')

if (process.env.PYRAMID_CAPTURE_REMOTE_DEBUG_PORT) {
  app.commandLine.appendSwitch('remote-debugging-port', String(process.env.PYRAMID_CAPTURE_REMOTE_DEBUG_PORT))
}

app.whenReady().then(async () => {
  try {
    // Load settings first so we have storagePath for DB initialization
    const settings = await loadSettings();

    // Initialize DB at storagePath location (not userData)
    await initializeDatabase(settings.storagePath);

    // Now initNode can use correct storagePath via cached settings
    await initNode();

    applyApplicationMenu(settings.language);
    if (process.platform === 'darwin') {
      app.dock.setIcon(resolveAppIconPath());
    }
    createWindow(settings);
    registerPathIPC();
    registerFileIPC();
    registerSettingsIPC();
    registerCaptureIPC();

    // Handler to reload database when storagePath changes
    ipcMain.handle('reloadDatabase', async (event, newStoragePath) => {
      try {
        console.log('Reloading database to:', newStoragePath);
        closeDatabase();
        await initializeDatabase(newStoragePath);
        await initNode();
        console.log('Database reloaded successfully');
        return true;
      } catch (err) {
        console.error('Failed to reload database:', err);
        return false;
      }
    });

    // 打开系统设置页面（用于权限授予）
    ipcMain.handle('openSystemSettings', async () => {
      // macOS 上打开系统偏好设置的应用权限页面
      if (process.platform === 'darwin') {
        // 使用 shell 打开 macOS 的隐私与安全性设置
        await shell.openPath('/System/Library/PreferencePanes/Privacy&Security.prefPane');
      } else if (process.platform === 'win32') {
        // Windows 上打开控制面板
        await shell.openPath('control');
      }
      return true;
    });

  } catch (err) {
    console.error('❌ App init failed:', err);
    app.quit(); // 很关键，不然会挂着
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow(getCachedSettings())
})
