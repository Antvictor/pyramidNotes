'use strict';

/**
 * @typedef {Object} Product
 * @property {string} id           - 产品 ID（App Store Connect 产品标识符）
 * @property {string} displayName  - 本地化显示名
 * @property {string} description  - 本地化描述
 * @property {string} price        - 本地化价格字符串（如 "¥68.00"）
 * @property {string} currency     - 货币代码（如 "CNY"）
 */

/**
 * @typedef {Object} PurchaseResult
 * @property {boolean} success     - 是否成功
 * @property {string} [error]      - 失败错误描述
 * @property {string} [receipt]    - Apple 收据（base64）；Mock 下为自定义 receipt 字符串
 */

/**
 * @typedef {Object} TransactionEvent
 * @property {'purchased'|'restored'|'cancelled'|'error'} type
 * @property {string} [productId]
 * @property {string} [receipt]
 * @property {string} [error]
 */

/**
 * @callback TransactionCallback
 * @param {TransactionEvent} tx
 */

/**
 * 苹果内购提供者抽象接口。
 * 所有方法均为异步或返回取消订阅函数。
 * 具体实现见 MockIAPProvider 和 AppleStoreKitProvider。
 */
class IAPProvider {
  /**
   * 获取可购买产品列表。
   * @returns {Promise<Product[]>}
   */
  async getProducts() {
    throw new Error('IAPProvider.getProducts() not implemented');
  }

  /**
   * 发起购买。
   * @param {string} productId
   * @returns {Promise<PurchaseResult>}
   */
  async purchase(productId) {
    throw new Error('IAPProvider.purchase() not implemented');
  }

  /**
   * 恢复购买。
   * @returns {Promise<PurchaseResult>}
   */
  async restorePurchases() {
    throw new Error('IAPProvider.restorePurchases() not implemented');
  }

  /**
   * 订阅交易状态变化。
   * @param {TransactionCallback} callback
   * @returns {() => void} 取消订阅函数
   */
  onTransactionUpdate(callback) {
    return () => {};
  }

  /**
   * 验证购买（不弹出 UI，静默查询）。用于启动时恢复状态。
   * @returns {Promise<PurchaseResult>}
   */
  async verifyPurchase() {
    throw new Error('IAPProvider.verifyPurchase() not implemented');
  }

  /**
   * 当前设备是否支持支付（仅 MAS 构建有实际意义）。
   * @returns {Promise<boolean>}
   */
  async canMakePayments() {
    return true;
  }
}

module.exports = { IAPProvider };
