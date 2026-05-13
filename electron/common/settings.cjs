const { app } = require('electron');
const fs = require('fs/promises');
const path = require('path');

const DEFAULT_SETTINGS = {
  theme: 'system',
  storagePath: path.join(app.getPath('documents'), 'pyramidNotes'),
  autoUpdate: true,
  language: 'en',
};

let cachedSettings = null;

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

async function loadSettings() {
  const settingsPath = getSettingsPath();

  try {
    const data = await fs.readFile(settingsPath, 'utf-8');
    const parsed = JSON.parse(data);
    return { ...DEFAULT_SETTINGS, ...parsed };
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
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
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
