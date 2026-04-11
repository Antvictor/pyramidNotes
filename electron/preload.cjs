const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('api', {
    openFile: (fileName) => ipcRenderer.invoke('openFile', fileName),
    deleteFile: (fileName) => ipcRenderer.invoke('deleteFile', fileName),
    renameFile: (oldFileName, newFileName) => ipcRenderer.invoke('renameFile', oldFileName, newFileName),
    saveFile: (fileName, content, nodeId) => ipcRenderer.invoke('saveFile', fileName, content, nodeId),
    getPath: () => ipcRenderer.invoke('getPath'),
    dbQuery: (sql, params) => ipcRenderer.invoke('dbQuery', sql, params),
})