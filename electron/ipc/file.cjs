const { ipcMain } = require("electron");
const path = require("path");
const { getDb } = require('../db/db.cjs')
const { resolveStoragePath } = require('../common/utils/fileHelper.js');
const { ERROR_CODES } = require('../common/utils/errorCodes.js');
const repository = require('../source/noteRepository.cjs');

// 笔记读写的统一超时：避免云盘占位文件让主线程/请求永久挂起
const NOTE_TIMEOUT_MS = 5000;

function reasonToErrorCode(reason) {
  if (reason === 'missing') return ERROR_CODES.ENOENT;
  if (reason === 'permission') return ERROR_CODES.EACCES;
  return ERROR_CODES.UNKNOWN;
}

function registerFileIPC() {
  // 打开笔记：经 Repository 精确定位 + 带超时读取；不可用返回可区分结果（不抛错，供渲染端提示/重试）
  ipcMain.handle("openFile", async (event, fileName) => {
    try {
      const dataPath = resolveStoragePath();
      const filePath = await repository.resolveFile(dataPath, fileName, { timeoutMs: NOTE_TIMEOUT_MS });
      if (!filePath) {
        return { error: ERROR_CODES.ENOENT, originalError: 'file not found' };
      }
      const r = await repository.readNote(filePath, { timeoutMs: NOTE_TIMEOUT_MS });
      if (r.unavailable) {
        return { error: reasonToErrorCode(r.reason), originalError: r.reason, unavailable: true, reason: r.reason };
      }
      return { data: r.data, content: r.content };
    } catch (error) {
      console.error("openFile error:", error)
      return { error: ERROR_CODES.UNKNOWN, originalError: error.message };
    }
  })

  // 保存笔记：写本地文件（真源）后同步 DB content（触发 FTS）
  ipcMain.handle("saveFile", async (event, fileName, yamlData, content, nodeId) => {
    try {
      const dataPath = resolveStoragePath();
      await repository.writeNote(path.join(dataPath, fileName), { yaml: yamlData, content });
      if (nodeId) {
        const db = getDb();
        db.prepare('UPDATE notes SET content = ?, last_up_time = ? WHERE id = ?')
          .run(content, new Date().toISOString(), nodeId);
      }
      return true;
    } catch (error) {
      console.error("saveFile error:", error)
      return { error: ERROR_CODES.UNKNOWN, originalError: error.message };
    }
  })

  ipcMain.handle("renameFile", async (event, oldFileName, newFileName) => {
    try {
      const dataPath = resolveStoragePath();
      await repository.rename(path.join(dataPath, oldFileName), path.join(dataPath, newFileName));
      return true;
    } catch (error) {
      console.error("renameFile error:", error)
      return { error: ERROR_CODES.UNKNOWN, originalError: error.message };
    }
  })

  // 合并写 frontmatter：读（带超时）→ 合并 → 写回，保留正文
  ipcMain.handle("updateYaml", async (event, fileName, newYamlData) => {
    try {
      const dataPath = resolveStoragePath();
      const filePath = path.join(dataPath, fileName);
      const r = await repository.readNote(filePath, { timeoutMs: NOTE_TIMEOUT_MS });
      if (r.unavailable) {
        return { error: reasonToErrorCode(r.reason), originalError: r.reason, unavailable: true };
      }
      const merged = {
        ...(r.data && typeof r.data === 'object' ? r.data : {}),
        ...(newYamlData && typeof newYamlData === 'object' ? newYamlData : {}),
      };
      await repository.writeNote(filePath, { yaml: merged, content: r.content });
      return true;
    } catch (error) {
      console.error("updateYaml error:", error)
      return { error: ERROR_CODES.UNKNOWN, originalError: error.message };
    }
  });
}

module.exports = { registerFileIPC }
