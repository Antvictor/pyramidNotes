const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const path = require('path')
const { registerFileIPC } = require('./ipc/file.cjs')
const { registerAttachmentIPC } = require('./ipc/attachment.cjs')
const { registerPathIPC } = require('./ipc/userPath.cjs')
const { createWindow } = require('./window/window.cjs')
const { initializeDatabase, closeDatabase } = require('./db/db.cjs')
const { setWriteGate } = require('./db/writeGate.cjs')
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

// 启动对账：单飞 + 必发完成通知。
// 窗口已先创建，对账失败只记录日志，不退出应用；渲染端靠 notes:reconciled 解除「建根」守卫。
// 事件可能早于 React 订阅（对账比首帧快），因此同时提供可拉取的状态。
let reconcilePromise = null
let reconcileState = { done: false, revision: 0, summary: null, error: null }

ipcMain.handle('notes:reconcileState', () => reconcileState)

function runReconcile(win, language, recovery) {
  if (reconcilePromise) return reconcilePromise
  const run = (async () => {
    let summary = null
    let error = null
    try {
      summary = await initNode()
    } catch (err) {
      error = err
      console.error('❌ 笔记对账失败（窗口保留）:', err)
    }

    reconcileState = {
      done: true,
      revision: reconcileState.revision + 1,
      summary,
      error: error ? String(error.message || error) : null,
    }

    if (win && !win.isDestroyed()) {
      const payload = {
        ...(summary || {}),
        ...(error ? { error: String(error.message || error) } : {}),
      }
      const send = () => {
        if (!win.isDestroyed()) win.webContents.send('notes:reconciled', payload)
      }
      if (win.webContents.isLoadingMainFrame?.()) win.webContents.once('did-finish-load', send)
      else send()
    }

    if (!error) showRecoveryNotice(win, language, recovery, summary)
    return { summary, error }
  })()
  reconcilePromise = run.finally(() => {
    reconcilePromise = null
    setWriteGate(null)
  })
  // 对账期间挂起非 SELECT 写入：渲染端「先写库、后写文件」的新建流程不会与对账交错
  setWriteGate(reconcilePromise)
  return reconcilePromise
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

    const resolvedLanguage = applyApplicationMenu(settings.language);
    if (process.platform === 'darwin') {
      app.dock.setIcon(resolveAppIconPath());
    }
    const mainWindow = createWindow(settings);
    registerPathIPC();
    registerFileIPC();
    registerAttachmentIPC();
    registerSettingsIPC();
    registerCaptureIPC();
    registerTrashIPC();
    registerLicenseIPC(mainWindow);
    registerPluginsIPC();

    // 首帧不等全盘扫描：对账在窗口出现后后台执行，完成后通知渲染端刷新
    void runReconcile(mainWindow, resolvedLanguage, recovery);

    // Handler to reload database when storagePath changes
    ipcMain.handle('reloadDatabase', async (event, newStoragePath) => {
      try {
        // 启动对账可能仍在扫描旧库，先等它结束再关闭连接
        if (reconcilePromise) await reconcilePromise.catch(() => {});
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
