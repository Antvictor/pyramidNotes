const { ipcMain, app } = require("electron");
const { test } = require("gray-matter");
const path = require("path");

function registerPathIPC() {
  ipcMain.handle("getPath", () => {
    return getPath("userData");
  });
}

const getPath = (type = "userData") => {
  return path.join(app.getPath(type), "data");
}


module.exports = { getPath, registerPathIPC }