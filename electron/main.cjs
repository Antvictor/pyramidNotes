const { app, BrowserWindow,ipcMain } = require('electron')
const path = require('path')
const fs = require('fs/promises')

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs')
    }
  })

  // 开发模式：加载 Vite 开发服务器
  win.loadURL('http://localhost:5173')

  // 生产模式：加载打包后的 index.html
  // win.loadFile(path.join(__dirname, '../dist/index.html'))
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})


ipcMain.handle("openFile", async (event, filePath) => {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    console.error("openFile error:", error)
  }

})

ipcMain.handle("saveFile", async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error("saveFile error:", error)
    return false;
  }
})

ipcMain.handle("getPath", async (event) => {
  return app.getPath("home");
})
