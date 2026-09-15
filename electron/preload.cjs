const {contextBridge, ipcRenderer} = require('electron');

function subscribeToIpc(channel, callback) {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('api', {
    openFile: (fileName) => ipcRenderer.invoke('openFile', fileName),
    renameFile: (oldFileName, newFileName) => ipcRenderer.invoke('renameFile', oldFileName, newFileName),
    saveFile: (fileName, yamlData, content, nodeId) => ipcRenderer.invoke('saveFile', fileName, yamlData, content, nodeId),
    updateYaml: (fileName, newYamlData) => ipcRenderer.invoke('updateYaml', fileName, newYamlData),
    deleteNotes: (nodeIds) => ipcRenderer.invoke('deleteNotes', nodeIds),
    listTrash: () => ipcRenderer.invoke('listTrash'),
    restoreTrash: (nodeId) => ipcRenderer.invoke('restoreTrash', nodeId),
    purgeExpiredTrash: () => ipcRenderer.invoke('purgeExpiredTrash'),
    getPath: () => ipcRenderer.invoke('getPath'),
    dbQuery: (sql, params) => ipcRenderer.invoke('dbQuery', sql, params),
    searchNotes: (keyword) => ipcRenderer.invoke('searchNotes', keyword),
    getSettings: () => ipcRenderer.invoke('getSettings'),
    saveSettings: (settings) => ipcRenderer.invoke('saveSettings', settings),
    capturePage: (options) => ipcRenderer.invoke('capturePage', options),
    selectDirectory: () => ipcRenderer.invoke('selectDirectory'),
    openSystemSettings: () => ipcRenderer.invoke('openSystemSettings'),
    reloadDatabase: (newStoragePath) => ipcRenderer.invoke('reloadDatabase', newStoragePath),
    onSettingsChanged: (callback) => subscribeToIpc('settings-changed', callback),
    saveAttachmentFromBase64: (base64Data, noteName, extension) => ipcRenderer.invoke('saveAttachmentFromBase64', base64Data, noteName, extension),
    saveAttachmentFromPath: (sourcePath, noteName) => ipcRenderer.invoke('saveAttachmentFromPath', sourcePath, noteName),
    readAttachment: (fileName) => ipcRenderer.invoke('readAttachment', fileName),
    getLicenseState: () => ipcRenderer.invoke('license:getState'),
    getLicenseProducts: () => ipcRenderer.invoke('license:getProducts'),
    purchaseLicense: (productId) => ipcRenderer.invoke('license:purchase', productId),
    restoreLicensePurchases: () => ipcRenderer.invoke('license:restorePurchases'),
    verifyLicensePurchase: () => ipcRenderer.invoke('license:verifyPurchase'),
    canMakeLicensePayments: () => ipcRenderer.invoke('license:canMakePayments'),
    onLicenseTransactionUpdated: (callback) => subscribeToIpc('license:transaction-updated', callback),
})
