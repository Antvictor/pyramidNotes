const { ipcMain } = require("electron");
const fs = require('fs/promises')
const { getDb } = require('../db/db.cjs')
const { resolveStoragePath, classifyError } = require('../common/utils/fileHelper.js');
const { ERROR_CODES } = require('../common/utils/errorCodes.js');
const path = require("path");
const matter = require('gray-matter');
const yaml = require('yaml');

// 文件名格式恒为 `${id}-${title}.md`，而 id 自身可能含 '-'（如 zbysv-KrUE3M、Fe-9MDeqq4oD），
// 所以不能按 '-' 切分反推 id，只能拿 frontmatter 里的 id 去匹配文件名前缀。
async function resolveFallbackFile(dataPath, fileName) {
    const target = String(fileName || '');
    if (!target) {
        return null;
    }

    const entries = await fs.readdir(dataPath, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isFile() || path.extname(entry.name) !== '.md') {
            continue;
        }

        const candidatePath = path.join(dataPath, entry.name);
        try {
            const parsed = matter(await fs.readFile(candidatePath, 'utf-8'));
            const id = parsed.data?.id;
            if (id && target.startsWith(`${id}-`)) {
                return candidatePath;
            }
        } catch {
            continue;
        }
    }

    return null;
}

function registerFileIPC() {
    const buildMarkdown = (yamlData, content) => {
        const safeContent = typeof content === 'string' ? content : '';
        const safeYaml = typeof yamlData === 'object' && yamlData !== null ? yamlData : {};
        const yamlStr = yaml.stringify(safeYaml).trim();
        return `---\n${yamlStr}\n---\n${safeContent}`;
    }

    ipcMain.handle("openFile", async (event, fileName) => {
        try {
            const dataPath = resolveStoragePath();
            let filePath = path.join(dataPath, fileName);
            try {
                await fs.access(filePath);
            } catch (accessError) {
                if (accessError.code !== 'ENOENT') {
                    throw accessError;
                }

                const fallbackPath = await resolveFallbackFile(dataPath, fileName);
                if (!fallbackPath) {
                    throw accessError;
                }
                filePath = fallbackPath;
            }
            const content = await fs.readFile(filePath, 'utf-8');
            return await matter(content);
        } catch (error) {
            console.error("openFile error:", error)
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
                db.prepare('UPDATE notes SET content = ?, last_up_time = ? WHERE id = ?')
                    .run(content, new Date().toISOString(), nodeId);
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
            const oldPath = path.join(dataPath, oldFileName);
            const newPath = path.join(dataPath, newFileName);
            console.log("renameFile:", { dataPath, oldPath, newPath });

            // 检查源文件是否存在
            try {
                await fs.access(oldPath);
                console.log("源文件存在:", oldPath);
            } catch (e) {
                console.error("源文件不存在:", oldPath, e.message);
            }

            // 检查目标文件是否已存在
            try {
                await fs.access(newPath);
                console.log("目标文件已存在:", newPath);
            } catch (e) {
                console.log("目标文件不存在:", newPath);
            }

            await fs.rename(oldPath, newPath);
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
            console.log("updateYaml:", { dataPath, filePath });

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
