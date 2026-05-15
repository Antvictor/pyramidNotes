const fs = require('fs/promises');
const path = require('path');
const { app } = require('electron');
const { getCachedSettings } = require('../settings.cjs');
const { ERROR_CODES } = require('./errorCodes');

// 默认存储路径
const DEFAULT_STORAGE_PATH = path.join(app.getPath('documents'), 'pyramidNotes');

/**
 * 动态获取当前设置的存储路径
 * 每次调用都从缓存设置中读取，确保返回最新路径
 * 如果配置的路径不存在，则创建该目录
 * 如果配置的路径是文件而非目录，则回退到默认路径
 */
function resolveStoragePath() {
  const settings = getCachedSettings();
  const configuredPath = settings?.storagePath;

  if (configuredPath) {
    try {
      const stats = require('fs').statSync(configuredPath);
      if (stats.isDirectory()) {
        // 确保目录存在
        require('fs').mkdirSync(configuredPath, { recursive: true });
        return configuredPath;
      } else {
        // 路径是文件而非目录，使用默认路径
        console.error(`Configured storage path is a file, not directory: ${configuredPath}`);
        return DEFAULT_STORAGE_PATH;
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        // 目录不存在，创建它
        require('fs').mkdirSync(configuredPath, { recursive: true });
        return configuredPath;
      }
      // 其他错误，使用默认路径
      console.error(`Error accessing storage path: ${error.message}`);
      return DEFAULT_STORAGE_PATH;
    }
  }
  return DEFAULT_STORAGE_PATH;
}

/**
 * 检测文件或目录的访问权限
 * @param {string} filePath - 文件或目录路径
 * @returns {Promise<{read: boolean, write: boolean}>} 权限检测结果
 */
async function checkFilePermission(filePath) {
  try {
    // 检查读权限
    await fs.access(filePath, fs.constants.R_OK);
    const readOk = true;

    // 检查写权限
    await fs.access(filePath, fs.constants.W_OK);
    const writeOk = true;

    return { read: readOk, write: writeOk };
  } catch (error) {
    return { read: false, write: false };
  }
}

/**
 * 根据错误类型分类错误码
 * @param {Error} error - 原始错误对象
 * @returns {string} 错误码
 */
function classifyError(error) {
  if (!error) {
    return ERROR_CODES.UNKNOWN;
  }

  const code = error.code || '';
  const errno = error.errno;

  // Node.js 文件系统错误码映射
  switch (code) {
    case 'EACCES':
    case 'EPERM':
      return ERROR_CODES.EACCES;
    case 'ENOENT':
    case 'ENOTDIR':
      return ERROR_CODES.ENOENT;
    case 'EEXIST':
      return ERROR_CODES.EEXIST;
    case 'EBUSY':
      return ERROR_CODES.EBUSY;
    case 'EINVAL':
      return ERROR_CODES.EINVAL;
    case 'EIO':
      return ERROR_CODES.EIO;
    default:
      // 如果无法识别，尝试通过 errno 判断（Windows）
      if (errno === -13 || errno === 13) return ERROR_CODES.EACCES;  // EACCES
      if (errno === -2 || errno === 2) return ERROR_CODES.ENOENT;   // ENOENT
      return ERROR_CODES.UNKNOWN;
  }
}

/**
 * 验证存储路径是否存在且可访问
 * @param {string} storagePath - 存储路径
 * @returns {Promise<{valid: boolean, error: string|null}>} 验证结果
 */
async function validateStoragePath(storagePath) {
  try {
    const stats = await fs.stat(storagePath);
    if (!stats.isDirectory()) {
      return { valid: false, error: ERROR_CODES.ENOTDIR };
    }

    // 检查读写权限
    const perms = await checkFilePermission(storagePath);
    if (!perms.read || !perms.write) {
      return { valid: false, error: ERROR_CODES.EACCES };
    }

    return { valid: true, error: null };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { valid: false, error: ERROR_CODES.ENOENT };
    }
    return { valid: false, error: classifyError(error) };
  }
}

module.exports = {
  resolveStoragePath,
  checkFilePermission,
  classifyError,
  validateStoragePath,
  DEFAULT_STORAGE_PATH
};