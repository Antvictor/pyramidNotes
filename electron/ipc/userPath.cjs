const { ipcMain, app } = require("electron");
const path = require("path");
function registerPathIPC() {
  ipcMain.handle("getPath", () => {
    return path.join(app.getPath("userData"), "data");
  });
}

const getPath = (type = "userData") => {
  return app.getPath(type)
}


module.exports = { getPath, registerPathIPC }