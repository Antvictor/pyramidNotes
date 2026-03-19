const { ipcMain } = require("electron");
const fs = require('fs/promises')
const { getDb } = require('../db/db.cjs')

function registerFileIPC() {

    ipcMain.handle("openFile", async (event, filePath) => {
        try {
            return await fs.readFile(filePath, 'utf-8');
        } catch (error) {
            console.error("openFile error:", error)
        }

    })

    ipcMain.handle("saveFile", async (event, filePath, content, nodeId) => {
        try {
            await fs.writeFile(filePath, content, 'utf-8');
            // 同步更新 notes 表的 content 字段，触发 FTS 同步
            if (nodeId) {
                console.log("Updating DB for nodeId:", nodeId);
                const db = getDb();
                db.prepare('UPDATE notes SET content = ? WHERE id = ?').run(content, nodeId);
            }
            return true;
        } catch (error) {
            console.error("saveFile error:", error)
            return false;
        }
    })
}

module.exports = { registerFileIPC }