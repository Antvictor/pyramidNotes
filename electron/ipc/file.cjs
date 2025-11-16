const { ipcMain } = require("electron");
const fs = require('fs/promises')

function registerFileIPC() {

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
}

module.exports = { registerFileIPC }