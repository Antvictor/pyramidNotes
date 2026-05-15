const { ipcMain, shell } = require("electron");
const fs = require('fs/promises')
const { getDb } = require('../db/db.cjs')
const { resolveStoragePath, classifyError } = require('../common/utils/fileHelper.js');
const { ERROR_CODES } = require('../common/utils/errorCodes.js');
const path = require("path");
const matter = require('gray-matter');
const yaml = require('yaml');

function registerFileIPC() {
    const buildMarkdown = (yamlData, content) => {
        const safeContent = typeof content === 'string' ? content : '';
        const safeYaml = typeof yamlData === 'object' ? yamlData : {};

        return matter.stringify(safeContent, safeYaml);
    }

    ipcMain.handle("openFile", async (event, fileName) => {
        try {
            const dataPath = resolveStoragePath();
            const filePath = path.join(dataPath, fileName);
            const content = await fs.readFile(filePath, 'utf-8');
            return await matter(content);
        } catch (error) {
            console.error("openFile error:", error)
            return { error: classifyError(error), originalError: error.message };
        }
    })

    ipcMain.handle("deleteFile", async (event, fileName, nodeId) => {
        try {
            const dataPath = resolveStoragePath();
            const filePath = path.join(dataPath, fileName);

            // Read file content before trashing for soft delete
            let fileContent = null;
            let noteData = null;
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                const parsed = matter(content);

                // Get existing note data from DB if nodeId provided
                const db = getDb();
                if (nodeId) {
                    noteData = db.prepare('SELECT * FROM notes WHERE id = ?').get(nodeId);
                }

                // Insert into deleted_notes for potential recovery
                db.prepare(`
                    INSERT INTO deleted_notes (id, filename, content, yaml_data, original_path)
                    VALUES (?, ?, ?, ?, ?)
                `).run(
                    nodeId || `deleted-${Date.now()}`,
                    fileName,
                    content,
                    JSON.stringify(parsed.data || {}),
                    filePath
                );
            } catch (readError) {
                console.log('Could not read file for soft delete:', readError.message);
            }

            // Move file to trash (existing behavior)
            return await shell.trashItem(filePath);
        } catch (error) {
            console.error("deleteFile error:", error)
            return { error: classifyError(error), originalError: error.message };
        }
    })

    ipcMain.handle("saveFile", async (event, fileName, yamlData, content, nodeId) => {
        try {
            console.log("saveFile called with:", { fileName, yamlData, content, nodeId });
            const dataPath = resolveStoragePath();

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
            return { error: classifyError(error), originalError: error.message };
        }
    })

    ipcMain.handle("renameFile", async (event, oldFileName, newFileName) => {
        try {
            const dataPath = resolveStoragePath();
            await fs.rename(path.join(dataPath, oldFileName), path.join(dataPath, newFileName));
            return true;
        } catch (error) {
            console.error("renameFile error:", error)
            return { error: classifyError(error), originalError: error.message };
        }
    })

    ipcMain.handle("updateYaml", async (event, fileName, newYamlData) => {
        try {
            const dataPath = resolveStoragePath();
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
            return { error: classifyError(error), originalError: error.message };
        }
    });
}

module.exports = { registerFileIPC }