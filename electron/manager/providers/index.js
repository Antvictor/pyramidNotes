'use strict';

const { MockIAPProvider } = require('./MockIAPProvider.js');
const { AppleStoreKitProvider } = require('./AppleStoreKitProvider.js');
const { setProvider: setLicenseStateProvider } = require('../licenseStateManager.cjs');

/**
 * ↓↓↓ 测试阶段设为 true（走 Mock）。上架 MAS 前改为 false ↓↓↓
 *
 * 切换策略：
 *   FORCE_MOCK === true                → MockIAPProvider（开发/DMG 测试用）
 *   FORCE_MOCK === false && process.mas → AppleStoreKitProvider（MAS 上架用）
 *   FORCE_MOCK === false && !process.mas → 自动回退到 MockIAPProvider（安全网）
 */
const FORCE_MOCK = true;

let _instance = null;

/**
 * 获取当前 Provider 实例（单例）。
 * 同时根据开关切换 licenseStateManager 实现（Mock 本地判定 / Apple 标识）。
 * @returns {import('./IAPProvider').IAPProvider}
 */
function createProvider() {
  if (_instance) return _instance;
  const useMock = FORCE_MOCK || !process.mas;
  _instance = useMock ? new MockIAPProvider() : new AppleStoreKitProvider();

  setLicenseStateProvider(
    useMock
      ? require('../licenseStateManager.cjs').mockState
      : require('../licenseStateManager.cjs').appleState
  );

  console.log(
    `[providers/index] initialized Provider = ${useMock ? 'MockIAPProvider' : 'AppleStoreKitProvider'}` +
    (useMock && process.mas ? ' (forced mock in MAS build)' : '') +
    (useMock && !process.mas ? ' (non-MAS build, mock is required)' : '')
  );
  return _instance;
}

module.exports = { createProvider };