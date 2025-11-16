const { BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "../preload.cjs"),
    }
  });

  win.loadURL("http://localhost:5173");
  return win;
}

module.exports = { createWindow };
