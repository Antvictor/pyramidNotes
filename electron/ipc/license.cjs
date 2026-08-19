'use strict';

const { ipcMain } = require('electron');
const purchaseManager = require('../manager/purchaseManager.cjs');
const { getProvider: getLicenseStateManager } = require('../manager/licenseStateManager.cjs');
const listenerManager = require('../manager/listenerManager.cjs');

/**
 * 注册所有 license 相关的 IPC handlers。
 * 需要传入主窗口引用，以便广播交易更新事件。
 * @param {import('electron').BrowserWindow} mainWindow
 */
function registerLicenseIPC(mainWindow) {
  // 查询许可状态
  ipcMain.handle('license:getState', async () => {
    try {
      return await getLicenseStateManager().getState();
    } catch (err) {
      console.error('[license:getState] error:', err);
      return { state: 'trial', data: {} };
    }
  });

  // 获取可购买产品列表
  ipcMain.handle('license:getProducts', async () => {
    try {
      return await purchaseManager.getProducts();
    } catch (err) {
      console.error('[license:getProducts] error:', err);
      return [];
    }
  });

  // 发起购买
  ipcMain.handle('license:purchase', async (_event, productId) => {
    try {
      return await purchaseManager.purchase(productId);
    } catch (err) {
      console.error('[license:purchase] error:', err);
      return { success: false, error: err.message };
    }
  });

  // 恢复购买
  ipcMain.handle('license:restorePurchases', async () => {
    try {
      return await purchaseManager.restorePurchases();
    } catch (err) {
      console.error('[license:restorePurchases] error:', err);
      return { success: false, error: err.message };
    }
  });

  // 验证购买（启动时自动调用）
  ipcMain.handle('license:verifyPurchase', async () => {
    try {
      return await purchaseManager.verifyPurchase();
    } catch (err) {
      console.error('[license:verifyPurchase] error:', err);
      return { success: false, error: err.message };
    }
  });
  // 是否支持支付
  ipcMain.handle('license:canMakePayments', async () => {
    try {
      return await purchaseManager.canMakePayments();
    } catch {
      return false;
    }
  });

  // 监听交易更新：转发到渲染进程
  listenerManager.subscribe((tx) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.webContents.send('license:transaction-updated', tx);
      } catch (err) {
        console.error('[license:transaction-updated] send failed:', err);
      }
    }
  });

  // 如果主窗口重建，需更新引用（这里暂用 subscribe 时绑定 mainWindow）
  // 更稳健的做法：每次 send 前通过 BrowserWindow.getAllWindows() 找到主窗口
}

module.exports = { registerLicenseIPC };
