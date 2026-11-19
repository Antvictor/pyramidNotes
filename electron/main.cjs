const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const path = require('path')
const { registerFileIPC } = require('./ipc/file.cjs')
const { registerAttachmentIPC } = require('./ipc/attachment.cjs')
const { registerPathIPC } = require('./ipc/userPath.cjs')
const { createWindow } = require('./window/window.cjs')
const { initializeDatabase, closeDatabase } = require('./db/db.cjs')
const { initNode } = require('./nodes/initNode')
const { loadSettings, getCachedSettings } = require('./common/settings.cjs')
const { resolveAppIconPath } = require('./common/assets.cjs')
const { registerSettingsIPC } = require('./ipc/settings.cjs')
const { registerCaptureIPC } = require('./ipc/capture.cjs')
const { registerTrashIPC } = require('./ipc/trash.cjs')
const { applyApplicationMenu } = require('./common/locale.cjs')
const { buildRecoveryNotice } = require('./common/recoveryNotice.cjs')
const { registerLicenseIPC } = require('./ipc/license.cjs')
const { registerPluginsIPC } = require('./ipc/plugins.cjs')
const { ensureOfficialPlugins, resolveSeedRoot } = require('./common/pluginSeed.cjs')

// 数据库损坏后已自动从本地文件重建：窗口加载完成后提示一次（含备份位置与恢复数量）
function showRecoveryNotice(win, language, recovery, summary) {
  if (!recovery?.recovered) return
  const notice = buildRecoveryNotice(language, {
    backupPaths: recovery.backupPaths,
    nodeCount: summary?.nodeCount,
    trashCount: summary?.trashCount,
  })
  const show = () => {
    if (!win || win.isDestroyed()) return
    dialog.showMessageBox(win, {
      type: 'info',
      title: notice.title,
      message: notice.message,
      detail: notice.detail,
      buttons: [notice.ok],
      noLink: true,
    }).catch((error) => console.error('recovery notice failed:', error))
  }
  if (win?.webContents?.isLoading?.()) win.webContents.once('did-finish-load', show)
  else show()
}

if (process.env.PYRAMID_CAPTURE_REMOTE_DEBUG_PORT) {
  app.commandLine.appendSwitch('remote-debugging-port', String(process.env.PYRAMID_CAPTURE_REMOTE_DEBUG_PORT))
}

app.whenReady().then(async () => {
  try {
    // Load settings first so we have storagePath for DB initialization
    const settings = await loadSettings();

    // Seed official plugins into userData before the window loads them
    try {
      const seedResult = ensureOfficialPlugins({
        seedRoot: resolveSeedRoot({
          isPackaged: app.isPackaged,
          resourcesPath: process.resourcesPath,
          appPath: app.getAppPath(),
        }),
        officialRoot: path.join(app.getPath('userData'), 'plugins'),
      })
      if (seedResult.copied.length || seedResult.updated.length || seedResult.errors.length) {
        console.log('plugin seed:', seedResult)
      }
    } catch (error) {
      console.error('plugin seed failed:', error)
    }

    // Initialize DB at storagePath location (not userData)
    const recovery = await initializeDatabase(settings.storagePath);

    // Now initNode can use correct storagePath via cached settings
    const initSummary = await initNode();

    const resolvedLanguage = applyApplicationMenu(settings.language);
    if (process.platform === 'darwin') {
      app.dock.setIcon(resolveAppIconPath());
    }
    const mainWindow = createWindow(settings);
    showRecoveryNotice(mainWindow, resolvedLanguage, recovery, initSummary);
    registerPathIPC();
    registerFileIPC();
    registerAttachmentIPC();
    registerSettingsIPC();
    registerCaptureIPC();
    registerTrashIPC();
    registerLicenseIPC(mainWindow);
    registerPluginsIPC();

    // Handler to reload database when storagePath changes
    ipcMain.handle('reloadDatabase', async (event, newStoragePath) => {
      try {
        console.log('Reloading database to:', newStoragePath);
        closeDatabase();
        const reloadRecovery = await initializeDatabase(newStoragePath);
        const reloadSummary = await initNode();
        showRecoveryNotice(
          BrowserWindow.fromWebContents(event.sender),
          resolvedLanguage,
          reloadRecovery,
          reloadSummary,
        );
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
