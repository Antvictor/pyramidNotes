const { app, BrowserWindow,ipcMain } = require('electron')
const path = require('path')
const {registerFileIPC} = require('./ipc/file.cjs')
const {registerPathIPC} = require('./ipc/userPath.cjs')
const {createWindow} = require('./window/window.cjs')
const {initializeDatabase} = require('./db/db.cjs')


app.whenReady().then(() => {
  createWindow(), 
  registerPathIPC(),
  registerFileIPC(),
  initializeDatabase()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
