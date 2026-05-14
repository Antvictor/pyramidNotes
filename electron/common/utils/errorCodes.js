// 文件操作错误码定义
// 遵循最小知道原则：集中管理错误码，便于维护和扩展

const ERROR_CODES = {
  // 文件系统错误
  EACCES: 'EACCES',       // 权限不足
  ENOENT: 'ENOENT',       // 文件或目录不存在
  ENOTDIR: 'ENOTDIR',     // 路径不是目录
  EEXIST: 'EEXIST',       // 文件已存在
  EBUSY: 'EBUSY',         // 文件忙
  EINVAL: 'EINVAL',       // 无效参数
  EIO: 'EIO',             // I/O 错误
  EPERM: 'EPERM',         // 操作不允许

  // 应用层错误
  UNKNOWN: 'UNKNOWN',     // 未知错误
  VALIDATION_ERROR: 'VALIDATION_ERROR',  // 验证错误
};

module.exports = { ERROR_CODES };