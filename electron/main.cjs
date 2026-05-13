const { app, BrowserWindow, ipcMain } = require('electron')
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
