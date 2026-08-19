'use strict';

const { IAPProvider } = require('./IAPProvider.js');
const { PRODUCT_ID_PERMANENT } = require('../constants.js');
const licenseData = require('../licenseData.cjs');

/**
 * Mock IAP 提供者：用于开发期（DMG 构建 / MAS 证书未到位）。
 * 不依赖任何 StoreKit API。
 */
class MockIAPProvider extends IAPProvider {
  constructor() {
    super();
    /** @type {Set<import('./IAPProvider').TransactionCallback>} */
    this._listeners = new Set();
  }

  async getProducts() {
    return [
      {
        id: PRODUCT_ID_PERMANENT,
        displayName: '永久版',
        description: '一次性购买，解锁全部功能',
        price: '¥68.00',
        currency: 'CNY',
      },
    ];
  }

  async purchase(productId) {
    if (productId !== PRODUCT_ID_PERMANENT) {
      return { success: false, error: `unknown product: ${productId}` };
    }
    const receipt = `mock-receipt-${Date.now()}`;
    this._broadcast({ type: 'purchased', productId, receipt });
    return { success: true, receipt };
  }

  async restorePurchases() {
    const data = licenseData.loadLicenseData();
    if (!data.purchasedAt) {
      return { success: false, error: 'no-purchases' };
    }
    return { success: true, receipt: data.receipt };
  }

  /**
   * 验证购买（Mock）：与 restore 一致，查本地缓存。
   */
  async verifyPurchase() {
    return this.restorePurchases();
  }

  onTransactionUpdate(callback) {
    this._listeners.add(callback);
    return () => {
      this._listeners.delete(callback);
    };
  }

  async canMakePayments() {
    return true;
  }

  /**
   * @param {import('./IAPProvider').TransactionEvent} tx
   */
  _broadcast(tx) {
    for (const cb of this._listeners) {
      try {
        cb(tx);
      } catch (err) {
        console.error('[MockIAPProvider] listener error:', err);
      }
    }
  }
}

module.exports = { MockIAPProvider };
