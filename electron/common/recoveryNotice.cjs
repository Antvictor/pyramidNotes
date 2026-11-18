// 数据库自动恢复后的原生提示文案（主进程使用，不依赖 electron，便于单测）
const NOTICES = {
  en: {
    title: 'Database recovered',
    message: 'The local database was corrupted and has been rebuilt from your note files.',
    detail: ({ backupPaths, nodeCount, trashCount }) => [
      `Corrupted files kept at: ${backupPaths.length ? backupPaths.join('\n') : '(none)'}`,
      `Note files: ${nodeCount}`,
      `Trash entries: ${trashCount}`,
    ].join('\n'),
    ok: 'OK',
  },
  'zh-CN': {
    title: '数据库已自动恢复',
    message: '检测到数据库文件损坏，已根据本地笔记文件自动重建。',
    detail: ({ backupPaths, nodeCount, trashCount }) => [
      `损坏文件备份：${backupPaths.length ? backupPaths.join('\n') : '（无）'}`,
      `笔记文件：${nodeCount}`,
      `回收站条目：${trashCount}`,
    ].join('\n'),
    ok: '好',
  },
};

function buildRecoveryNotice(language, info = {}) {
  const data = {
    backupPaths: Array.isArray(info.backupPaths) ? info.backupPaths : [],
    nodeCount: Number.isFinite(info.nodeCount) ? info.nodeCount : 0,
    trashCount: Number.isFinite(info.trashCount) ? info.trashCount : 0,
  };
  const template = NOTICES[language] || NOTICES.en;
  return {
    title: template.title,
    message: template.message,
    detail: template.detail(data),
    ok: template.ok,
  };
}

module.exports = { buildRecoveryNotice };
