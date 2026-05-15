const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('api', {
    openFile: (fileName) => ipcRenderer.invoke('openFile', fileName),
    deleteFile: (fileName, nodeId) => ipcRenderer.invoke('deleteFile', fileName, nodeId),
    renameFile: (oldFileName, newFileName) => ipcRenderer.invoke('renameFile', oldFileName, newFileName),
    saveFile: (fileName, yamlData, content, nodeId) => ipcRenderer.invoke('saveFile', fileName, yamlData, content, nodeId),
    updateYaml: (fileName, newYamlData) => ipcRenderer.invoke('updateYaml', fileName, newYamlData),
    getPath: () => ipcRenderer.invoke('getPath'),
    dbQuery: (sql, params) => ipcRenderer.invoke('dbQuery', sql, params),
    getSettings: () => ipcRenderer.invoke('getSettings'),
    saveSettings: (settings) => ipcRenderer.invoke('saveSettings', settings),
    selectDirectory: () => ipcRenderer.invoke('selectDirectory'),
    openSystemSettings: () => ipcRenderer.invoke('openSystemSettings'),
    reloadDatabase: (newStoragePath) => ipcRenderer.invoke('reloadDatabase', newStoragePath),
    onSettingsChanged: (callback) => ipcRenderer.on('settings-changed', (event, settings) => callback(settings)),
})