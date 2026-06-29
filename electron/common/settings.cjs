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
      backToMap: 'Escape',
    },
  },
};

let cachedSettings = null;

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

async function loadSettings() {
  const settingsPath = getSettingsPath();

  try {
    const data = await fsPromises.readFile(settingsPath, 'utf-8');
    const parsed = JSON.parse(data);
    cachedSettings = { ...DEFAULT_SETTINGS, ...parsed };
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
  const settingsPath = getSettingsPath();
  try {
    // Ensure parent directory exists before writing
    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fsPromises.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    cachedSettings = settings;
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
  getSettingsPath,
  loadSettings,
  saveSettings,
  getCachedSettings,
  setCachedSettings,
};
