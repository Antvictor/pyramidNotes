const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('api', {
    openFile: (filePath) => ipcRenderer.invoke('openFile', filePath),
    saveFile: (filePath, content) => ipcRenderer.invoke('saveFile', filePath, content),
    getPath: () => ipcRenderer.invoke('getPath'),
    dbQuery: (sql, params) => ipcRenderer.invoke('dbQuery', sql, params),
})