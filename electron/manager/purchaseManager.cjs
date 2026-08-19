'use strict';

const { createProvider } = require('./providers/index.js');
const { loadLicenseData, saveLicenseData } = require('./licenseData.cjs');
const listenerManager = require('./listenerManager.cjs');

let _providerBound = false;

/**
 * 懒初始化 Provider 并绑定到 listenerManager。
 */
function _getProvider() {
  const provider = createProvider();
  if (!_providerBound) {
    listenerManager.bindProvider(provider);
    _providerBound = true;
  }
  return provider;
}

async function getProducts() {
  return _getProvider().getProducts();
}

async function purchase(productId) {
  const result = await _getProvider().purchase(productId);
  if (result.success) {
    await saveLicenseData({
      ...loadLicenseData(),
      purchasedAt: new Date().toISOString(),
      receipt: result.receipt,
    });
    listenerManager.notifyTransactionUpdated({
      type: 'purchased',
      productId,
      receipt: result.receipt,
    });
  }
  return result;
}

async function restorePurchases() {
  const result = await _getProvider().restorePurchases();
  if (result.success) {
    await saveLicenseData({
      ...loadLicenseData(),
      purchasedAt: new Date().toISOString(),
      receipt: result.receipt,
    });
    listenerManager.notifyTransactionUpdated({
      type: 'restored',
      receipt: result.receipt,
    });
  }
  return result;
}

async function verifyPurchase() {
  // Trigger storeKit restore and wait for success
  const result = await _getProvider().verifyPurchase();
  if (result.success) {
    await saveLicenseData({
      ...loadLicenseData(),
      purchasedAt: new Date().toISOString(),
      receipt: result.receipt,
    });
    listenerManager.notifyTransactionUpdated({
      type: 'restored',
      receipt: result.receipt,
    });
  }
  return result;
}

async function canMakePayments() {
  return _getProvider().canMakePayments();
}

module.exports = {
  getProducts,
  purchase,
  restorePurchases,
  verifyPurchase,
  canMakePayments,
};
