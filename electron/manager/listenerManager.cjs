'use strict';

/**
 * 交易事件订阅管理器。
 * 桥接 Provider 层的 onTransactionUpdate 与外部（IPC）的订阅者。
 */

let _listeners = new Set();
let _providerUnsub = null;
let _providerRef = null;

/**
 * 绑定 Provider（由 purchaseManager 初始化时调用）。
 * 绑定后开始监听 Provider 的交易事件并广播给所有订阅者。
 * @param {import('./providers/IAPProvider').IAPProvider} provider
 */
function bindProvider(provider) {
  if (_providerRef === provider) return;
  // 清理旧绑定
  if (_providerUnsub) {
    _providerUnsub();
    _providerUnsub = null;
  }
  _providerRef = provider;
  _providerUnsub = provider.onTransactionUpdate((tx) => {
    notifyTransactionUpdated(tx);
  });
}

/**
 * 订阅交易更新。
 * @param {(tx: import('./providers/IAPProvider').TransactionEvent) => void} callback
 * @returns {() => void} 取消订阅函数
 */
function subscribe(callback) {
  _listeners.add(callback);
  return () => {
    _listeners.delete(callback);
  };
}

/**
 * 主动触发交易更新广播（供 purchaseManager 在本地购买成功后调用）。
 * @param {import('./providers/IAPProvider').TransactionEvent} tx
 */
function notifyTransactionUpdated(tx) {
  for (const cb of _listeners) {
    try {
      cb(tx);
    } catch (err) {
      console.error('[listenerManager] subscriber error:', err);
    }
  }
}

/**
 * 清理所有订阅（用于测试或 app.quit 时）。
 */
function dispose() {
  if (_providerUnsub) {
    _providerUnsub();
    _providerUnsub = null;
  }
  _listeners.clear();
  _providerRef = null;
}

module.exports = {
  bindProvider,
  subscribe,
  notifyTransactionUpdated,
  dispose,
};
