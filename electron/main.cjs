const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const { registerFileIPC } = require('./ipc/file.cjs')
const { registerPathIPC } = require('./ipc/userPath.cjs')
const { createWindow } = require('./window/window.cjs')
const { initializeDatabase } = require('./db/db.cjs')
const { initNode } = require('./node/initNode')
const { loadSettings, getCachedSettings } = require('./common/settings.cjs')
const { registerSettingsIPC } = require('./ipc/settings.cjs')


app.whenReady().then(async () => {
  try {
    await initializeDatabase();
    await initNode();

    // Load settings before creating window
    const settings = await loadSettings();

    createWindow(settings);
    registerPathIPC();
    registerFileIPC();
    registerSettingsIPC();

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
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
