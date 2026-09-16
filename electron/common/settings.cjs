const { app } = require('electron');
const fs = require('fs');
const path = require('path');

// Use fs.promises for async operations
const fsPromises = require('fs').promises;

const DEFAULT_SETTINGS = {
  theme: 'system',
  storagePath: path.join(app.getPath('documents'), 'pyramidNotes'),
  autoUpdate: true,
  language: 'system',
  shortcuts: {
    node: {
      newNode: 'Ctrl+N',
      renameNode: 'F2',
      deleteNode: 'Delete',
    },
    note: {
      bold: 'Ctrl+B',
      italic: 'Ctrl+I',
      heading1: 'Ctrl+1',
      heading2: 'Ctrl+2',
    },
    global: {
      search: 'Ctrl+K',
      searchFullText: 'Ctrl+Shift+K',
      backToMap: 'Escape',
    },
  },
  editorWidthMode: 'constrained',
  showBacklinks: true,
  deleteMode: 'trash',        // 'trash' | 'systemTrash' | 'permanent'
  trashRetentionDays: 30,
};

// 把 shortcuts 与默认值深合并（三段分别展开），保证调用方拿到的永远是完整对象。
// 前端不再持有默认值副本，这里是唯一权威来源。
function mergeShortcuts(incoming) {
  const d = DEFAULT_SETTINGS.shortcuts;
  const s = incoming || {};
  return {
    node: { ...d.node, ...(s.node || {}) },
    note: { ...d.note, ...(s.note || {}) },
    global: { ...d.global, ...(s.global || {}) },
  };
}

let cachedSettings = null;

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

async function loadSettings() {
  const settingsPath = getSettingsPath();

  try {
    const data = await fsPromises.readFile(settingsPath, 'utf-8');
    const parsed = JSON.parse(data);
    cachedSettings = { ...DEFAULT_SETTINGS, ...parsed, shortcuts: mergeShortcuts(parsed.shortcuts) };
    return cachedSettings;
  } catch (error) {
    if (error.code === 'ENOENT') {
      await saveSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    console.error('Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

async function saveSettings(settings) {
  // 归一化 shortcuts，保证 getSettings() 立刻返回完整对象（例如「重置」传 {}）
  const normalized = { ...settings, shortcuts: mergeShortcuts(settings.shortcuts) };
  const settingsPath = getSettingsPath();
  try {
    // Ensure parent directory exists before writing
    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fsPromises.writeFile(settingsPath, JSON.stringify(normalized, null, 2), 'utf-8');
    cachedSettings = normalized;
    return true;
  } catch (error) {
    console.error('Failed to save settings:', error);
    return false;
  }
}

function getCachedSettings() {
  return cachedSettings;
}

function setCachedSettings(settings) {
  cachedSettings = settings;
}

module.exports = {
  DEFAULT_SETTINGS,
  mergeShortcuts,
  getSettingsPath,
  loadSettings,
  saveSettings,
  getCachedSettings,
  setCachedSettings,
};
