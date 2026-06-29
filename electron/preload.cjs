const {contextBridge, ipcRenderer} = require('electron');

function subscribeToIpc(channel, callback) {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
}

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
    onSettingsChanged: (callback) => subscribeToIpc('settings-changed', callback),
})
