'use strict';

const fs = require('fs');
const path = require('path');
const { app, safeStorage } = require('electron');
const { LICENSE_FILE } = require('./constants.js');

const ENCRYPTION_MARKER = 'PYNENC1';

/**
 * 是否可用 OS 级加密。不可用时回退到明文 JSON。
 * @returns {boolean}
 */
function _isEncryptionAvailable() {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

/**
 * 读取持久化许可数据。
 * @returns {Object}
 */
function loadLicenseData() {
  const fp = getLicenseFilePath();
  let buf;
  try {
    buf = fs.readFileSync(fp);
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    console.error('[licenseData] failed to read:', err);
    return {};
  }

  const encryptionAvailable = _isEncryptionAvailable();
  const markerLen = Buffer.byteLength(ENCRYPTION_MARKER, 'utf8');

  if (buf.length > markerLen) {
    const marker = buf.slice(0, markerLen).toString('utf8');
    if (marker === ENCRYPTION_MARKER) {
      const encryptedPayload = buf.slice(markerLen);
      if (!encryptionAvailable) {
        console.warn('[licenseData] encrypted file but safeStorage unavailable');
        return {};
      }
      try {
        const decrypted = safeStorage.decryptString(encryptedPayload);
        return JSON.parse(decrypted);
      } catch {
        console.warn('[licenseData] decrypt failed (tampered?):', err);
        return {};
      }
    }
  }

  // plaintext + encryption available → rejected as tampered
  if (encryptionAvailable) {
    console.warn('[licenseData] plaintext file rejected');
    return {};
  }

  try {
    return JSON.parse(buf.toString('utf8'));
  } catch {
    console.error('[licenseData] parse error:', err);
    return {};
  }
}

/**
 * 写入许可数据（自动加密）。
 * @param {Object} data
 */
function saveLicenseData(data) {
  const fp = getLicenseFilePath();
  const dir = path.dirname(fp);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const json = JSON.stringify(data, null, 2);

  if (_isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(json);
    const marker = Buffer.from(ENCRYPTION_MARKER, 'utf8');
    fs.writeFileSync(fp, Buffer.concat([marker, encrypted]));
  } else {
    fs.writeFileSync(fp, json, 'utf8');
  }
}

function getLicenseFilePath() {
  return path.join(app.getPath('userData'), LICENSE_FILE);
}

module.exports = { loadLicenseData, saveLicenseData };
