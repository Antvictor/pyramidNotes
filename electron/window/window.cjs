const { BrowserWindow, app } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "../preload.cjs"),
    }
  });

  if (app.isPackaged) {
    // 生产环境：加载打包后的前端文件
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  } else {
    // 开发环境：加载 Vite dev server
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  }

  return win;
}

function getBasePath() {
  if (app.isPackaged) {
    // 打包后
    return process.resourcesPath;
  } else {
    // 开发环境
    return path.join(__dirname, '..'); 
    // ⚠️ 根据你项目结构调整
  }
}
module.exports = { createWindow, getBasePath };