'use strict';

const { IAPProvider } = require('./IAPProvider.js');
const { PRODUCT_ID_PERMANENT } = require('../constants.js');

/**
 * Apple StoreKit 真实提供者（Phase 2 / MAS 构建）。
 *
 * 注意：此 Provider 仅在 Mac App Store 构建（process.mas === true）下可用。
 * DMG 构建运行时会报 'inAppPurchase not available' 错误。
 * 在 DMG 下请始终使用 FORCE_MOCK = true。
 */
class AppleStoreKitProvider extends IAPProvider {
  constructor() {
    super();
    // 延迟 require：避免在 DMG 构建下加载时立即报错
    this._inAppPurchase = null;
    /** @type {Set<import('./IAPProvider').TransactionCallback>} */
    this._listeners = new Set();
    /** 顶层 transactions-updated 监听解绑函数（懒初始化） */
    this._topLevelUnsub = null;
  }

  /** @private */
  _ensureInAppPurchase() {
    if (!process.mas) {
      throw new Error(
        '[AppleStoreKitProvider] inAppPurchase only available in MAS build (process.mas === true). ' +
        'Set FORCE_MOCK = true for development/DMG builds.'
      );
    }
    if (!this._inAppPurchase) {
      const electron = require('electron');
      if (!electron.inAppPurchase) {
        throw new Error('[AppleStoreKitProvider] electron.inAppPurchase unavailable');
      }
      this._inAppPurchase = electron.inAppPurchase;
      this._ensureTopLevelListener();
    }
    return this._inAppPurchase;
  }

  /**
   * 注册顶层 transactions-updated 监听器：
   * Apple 会在购买流程之外也触发该事件（例如：延迟/恢复的交易），
   * 通过顶层监听转发给外部订阅者。
   * @private
   */
  _ensureTopLevelListener() {
    if (this._topLevelUnsub) return;
    const iap = this._inAppPurchase;
    const handler = (_event, transactions) => {
      for (const tx of transactions || []) {
        if (tx.transactionState === 'purchased' || tx.transactionState === 'restored') {
          try {
            iap.finishTransaction(tx);
          } catch (err) {
            console.error('[AppleStoreKitProvider] finishTransaction failed:', err);
          }
          this._broadcast({
            type: tx.transactionState === 'restored' ? 'restored' : 'purchased',
            productId: tx.productIdentifier,
            receipt: tx.transactionReceipt,
          });
        } else if (tx.transactionState === 'failed') {
          this._broadcast({
            type: 'error',
            productId: tx.productIdentifier,
            error: `${tx.errorCode}: ${tx.errorMessage}`,
          });
        } else if (tx.transactionState === 'cancelled') {
          this._broadcast({
            type: 'cancelled',
            productId: tx.productIdentifier,
          });
        }
      }
    };
    iap.on('transactions-updated', handler);
    this._topLevelUnsub = () => iap.off('transactions-updated', handler);
  }

  async getProducts() {
    const iap = this._ensureInAppPurchase();
    const products = await iap.getProducts([PRODUCT_ID_PERMANENT]);
    return products.map((p) => ({
      id: p.productIdentifier,
      displayName: p.localizedTitle,
      description: p.localizedDescription,
      price: String(p.price),
      currency: p.currency,
    }));
  }

  async purchase(productId) {
    const iap = this._ensureInAppPurchase();
    const can = await iap.canMakePayments();
    if (!can) {
      return { success: false, error: 'cannot-make-payments' };
    }

    return new Promise((resolve, reject) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ success: false, error: 'purchase-timeout' });
        }
      }, 60000);

      const off = iap.on('transactions-updated', (event, transactions) => {
        const tx = (transactions || []).find((t) => t.productIdentifier === productId);
        if (!tx) return;
        if (tx.transactionState === 'purchasing') return; // 进行中，等最终态
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        try { iap.finishTransaction(tx); } catch (err) { /* ignore */ }
        if (tx.transactionState === 'purchased' || tx.transactionState === 'restored') {
          resolve({ success: true, receipt: tx.transactionReceipt });
        } else if (tx.transactionState === 'failed') {
          resolve({ success: false, error: `${tx.errorCode}: ${tx.errorMessage}` });
        } else if (tx.transactionState === 'cancelled') {
          resolve({ success: false, error: 'cancelled' });
        } else if (tx.transactionState === 'deferred') {
          resolve({ success: false, error: 'deferred' });
        } else {
          resolve({ success: false, error: `unknown-state: ${tx.transactionState}` });
        }
      });

      try {
        iap.purchaseProduct(productId);
      } catch (err) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          off();
          resolve({ success: false, error: `invoke-failed: ${err.message}` });
        }
      }
    });
  }

  async restorePurchases() {
    const iap = this._ensureInAppPurchase();
    return new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ success: false, error: 'restore-timeout' });
        }
      }, 120000);

      const off = iap.on('transactions-updated', (event, transactions) => {
        // 找第一个 restored 类型的交易即可
        const tx = (transactions || []).find((t) => t.transactionState === 'restored');
        if (!tx || resolved) return;
        resolved = true;
        clearTimeout(timeout);
        try { iap.finishTransaction(tx); } catch (err) { /* ignore */ }
        resolve({ success: true, receipt: tx.transactionReceipt });
      });

      try {
        iap.restoreCompletedTransactions();
      } catch (err) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          off();
          resolve({ success: false, error: `invoke-failed: ${err.message}` });
        }
      }
    });
  }

  /**
   * 验证购买：静默调用恢复交易。用于启动时自动查询状态。
   * 与 restorePurchases 的区别是多了 productIdentifier 过滤和 broadcast。
   */
  async verifyPurchase() {
    const iap = this._ensureInAppPurchase();
    return new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ success: false, error: 'verify-timeout' });
        }
      }, 60000);

      const off = iap.on('transactions-updated', (event, transactions) => {
        const tx = (transactions || []).find(
          (t) => t.transactionState === 'restored' && t.productIdentifier === PRODUCT_ID_PERMANENT
        );
        if (!tx || resolved) return;
        resolved = true;
        clearTimeout(timeout);
        try { iap.finishTransaction(tx); } catch (err) { /* ignore */ }
        this._broadcast({ type: 'restored', productId: tx.productIdentifier, receipt: tx.transactionReceipt });
        resolve({ success: true, receipt: tx.transactionReceipt });
      });

      try {
        iap.restoreCompletedTransactions();
      } catch (err) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          off();
          resolve({ success: false, error: `invoke-failed: ${err.message}` });
        }
      }
    });
  }

  onTransactionUpdate(callback) {
    this._listeners.add(callback);
    // 触发顶层监听器初始化（如尚未初始化）
    if (process.mas) {
      try {
        this._ensureInAppPurchase();
      } catch {
        // 在非 MAS 下静默失败
      }
    }
    return () => {
      this._listeners.delete(callback);
    };
  }

  async canMakePayments() {
    try {
      const iap = this._ensureInAppPurchase();
      return await iap.canMakePayments();
    } catch {
      return false;
    }
  }

  /**
   * @private
   * @param {import('./IAPProvider').TransactionEvent} tx
   */
  _broadcast(tx) {
    for (const cb of this._listeners) {
      try {
        cb(tx);
      } catch (err) {
        console.error('[AppleStoreKitProvider] listener error:', err);
      }
    }
  }

  dispose() {
    if (this._topLevelUnsub) {
      this._topLevelUnsub();
      this._topLevelUnsub = null;
    }
    this._listeners.clear();
  }
}

module.exports = { AppleStoreKitProvider };
