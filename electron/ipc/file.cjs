const { ipcMain, shell } = require("electron");
const fs = require('fs/promises')
const { getDb } = require('../db/db.cjs')
const { getPath } = require('./userPath.cjs');
const path = require("path");
const matter = require('gray-matter');
const yaml = require('yaml');

function registerFileIPC() {
    const dataPath = path.join(getPath(), "data/");
    // todo 优化，路径不应该是前端传，应该是后端根据config来动态读取的，前端只需要传文件名称

    const buildMarkdown = (yamlData, content) => {
        const safeContent = typeof content === 'string' ? content : '';
        const safeYaml = typeof yamlData === 'object' ? yamlData : {};

        return matter.stringify(safeContent, safeYaml);
    }

    ipcMain.handle("openFile", async (event, fileName) => {
        try {
            const content = await fs.readFile(path.join(dataPath, fileName), 'utf-8');
            return await matter(content);
        } catch (error) {
            console.error("openFile error:", error)
        }

    })

    ipcMain.handle("deleteFile", async (event, fileName) => {
        try {
            return await shell.trashItem(path.join(dataPath, fileName));
        } catch (error) {
            console.error("deleteFile error:", error)
        }

    })


    ipcMain.handle("saveFile", async (event, fileName, yamlData, content, nodeId) => {
        try {

            await fs.writeFile(path.join(dataPath, fileName), buildMarkdown(yamlData, content), 'utf-8');
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

    ipcMain.handle("renameFile", async (event, oldFileName, newFileName) => {
        try {
            await fs.rename(path.join(dataPath, oldFileName), path.join(dataPath, newFileName));
            return true;
        } catch (error) {
            console.error("renameFile error:", error)
            return false;
        }
    })

    ipcMain.handle("updateYaml", async (event, fileName, newYamlData) => {
        try {
            const filePath = path.join(dataPath, fileName);

            const content = await fs.readFile(filePath, 'utf-8');
            const parsed = matter(content);
            console.log("updateYaml parsed:", parsed.data);

            const mergedYaml = {
                ...(typeof parsed.data === 'object' ? parsed.data : {}),
                ...(typeof newYamlData === 'object' ? newYamlData : {})
            };

            const newMd = buildMarkdown(mergedYaml, parsed.content);

            await fs.writeFile(filePath, newMd, 'utf-8');

            return true;
        } catch (error) {
            console.error("updateYaml error:", error)
            return false;
        }
    });
}

module.exports = { registerFileIPC }