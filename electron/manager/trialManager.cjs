'use strict';

const { TRIAL_DAYS } = require('./constants.js');

/**
 * 启动试用：首次调用时写入 trialStartedAt；再次调用原样返回。
 * @param {Object} licenseData  许可数据
 * @returns {Object} 更新后的许可数据
 */
function startTrial(licenseData) {
  if (licenseData.trialStartedAt) return licenseData;
  return { ...licenseData, trialStartedAt: new Date().toISOString() };
}

/**
 * 计算试用状态。
 * @param {Object} licenseData
 * @param {Date}   [now=new Date()]  当前时间（注入用于测试）
 * @returns {'never_started' | 'expired' | { remaining: number, expiresAt: Date }}
 */
function getTrialStatus(licenseData, now = new Date()) {
  if (!licenseData.trialStartedAt) return 'never_started';
  const start = new Date(licenseData.trialStartedAt);
  const diffMs = now.getTime() - start.getTime();
  const daysPassed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const remaining = TRIAL_DAYS - daysPassed;
  if (remaining <= 0) return 'expired';
  return {
    remaining,
    expiresAt: new Date(start.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
  };
}

module.exports = { startTrial, getTrialStatus };
