'use strict';

const { loadLicenseData, saveLicenseData } = require('./licenseData.cjs');
const { startTrial, getTrialStatus } = require('./trialManager.cjs');

let _provider = null;
/** @param {AbstractLicenseStateManager} p */
function setProvider(p) { _provider = p; }
/** @returns {AbstractLicenseStateManager} */
function getProvider() { return _provider ?? mockState; }

/* ────────────────────── abstract ────────────────────── */

class LicenseStateResult {
  /**
   * @param {'trial' | 'permanent' | 'expired'} state
   * @param {object} data
   */
  constructor(state, data) {
    this.state = state;
    this.data = data;
  }
}

class AbstractLicenseStateManager {
  /** @returns {Promise<LicenseStateResult>} */
  async getState() { throw new Error('getState not implemented'); }

  /**
   * 标记购买（本地缓存）。购买状态唯一来源仍是 Apple StoreKit。
   * @param {string} receipt
   * @returns {Promise<LicenseStateResult>}
   */
  async markPurchased(receipt) {
    const data = loadLicenseData();
    const updated = { ...data, purchasedAt: new Date().toISOString(), receipt };
    saveLicenseData(updated);
    return new LicenseStateResult('permanent', updated);
  }

  /** @param {object} data @returns {'trial'|'permanent'|'expired'} */
  computeState(data) {
    if (data.purchasedAt) return 'permanent';
    const status = getTrialStatus(data);
    return status === 'expired' ? 'expired' : 'trial';
  }
}

/* ────────────────────── mock implementation ────────────────────── */

class MockLicenseStateManager extends AbstractLicenseStateManager {
  async getState() {
    let data = loadLicenseData();
    if (!data.trialStartedAt && !data.purchasedAt) {
      data = startTrial(data);
      saveLicenseData(data);
    }
    return new LicenseStateResult(this.computeState(data), data);
  }
}

/* ────────────────────── apple implementation ────────────────────── */

let _verifyInFlight = false;

class AppleLicenseStateManager extends AbstractLicenseStateManager {
  async getState() {
    // 快速路径（离线友好）：已有本地购买缓存 → 直接永久
    let data = loadLicenseData();
    if (data.purchasedAt) {
      _startBackgroundVerify();
      return new LicenseStateResult('permanent', data);
    }

    // 无购买缓存（新装/清数据）：先按试用返回，后台向 Apple 核对购买状态
    if (!data.trialStartedAt) {
      data = startTrial(data);
      saveLicenseData(data);
    }
    _startBackgroundVerify();
    return new LicenseStateResult(this.computeState(data), data);
  }
}

/**
 * 后台静默核对 Apple 购买状态（一次性，防重入）。
 * 若 Apple 确认已购买 → 更新本地缓存并广播，前端监听到 restored 自动切永久。
 */
function _startBackgroundVerify() {
  if (_verifyInFlight) return;
  _verifyInFlight = true;

  const { createProvider } = require('./providers/index.js');
  const listenerManager = require('./listenerManager.cjs');

  const provider = createProvider();
  provider
    .verifyPurchase()
    .then((result) => {
      if (result.success) {
        const cached = loadLicenseData();
        const updated = {
          ...cached,
          purchasedAt: new Date().toISOString(),
          receipt: result.receipt,
        };
        saveLicenseData(updated);
        listenerManager.notifyTransactionUpdated({
          type: 'restored',
          productId: undefined,
          receipt: result.receipt,
        });
      }
    })
    .catch((err) => {
      console.error('[licenseStateManager] background verify failed:', err);
    })
    .finally(() => {
      _verifyInFlight = false;
    });
}

/* ────────────────────── singletons ────────────────────── */

const mockState = new MockLicenseStateManager();
const appleState = new AppleLicenseStateManager();

module.exports = {
  LicenseStateResult,
  AbstractLicenseStateManager,
  MockLicenseStateManager,
  AppleLicenseStateManager,
  mockState,
  appleState,
  setProvider,
  getProvider,
};