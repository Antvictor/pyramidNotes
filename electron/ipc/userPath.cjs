const { ipcMain, app } = require("electron");

function registerPathIPC() {
  ipcMain.handle("getPath", () => app.getPath("home"));
}

module.exports = { registerPathIPC }