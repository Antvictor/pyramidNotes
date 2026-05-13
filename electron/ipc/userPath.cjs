const { ipcMain, app } = require("electron");
const path = require("path");
const { getCachedSettings } = require('../common/settings.cjs');

function registerPathIPC() {
  ipcMain.handle("getPath", () => {
    return getDataPath();
  });
}

function getDataPath() {
  const settings = getCachedSettings();
  if (settings && settings.storagePath) {
    return settings.storagePath;
  }
  return path.join(app.getPath('documents'), 'pyramidNotes');
}

function getPath(type = "userData") {
  return path.join(app.getPath(type), "data");
}


module.exports = { getPath, registerPathIPC, getDataPath }