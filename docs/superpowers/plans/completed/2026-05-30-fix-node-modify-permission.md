# fix-node-modify-permission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复修改节点名称时的权限错误问题

**Architecture:** 对比 `saveFile`（新建文件，正常）和 `renameFile`/`updateYaml`（操作已有文件，权限错误）的实现差异，定位问题并修复。问题可能出在：1) 文件权限问题 2) API 实现差异 3) 文件锁定

**Tech Stack:** Electron IPC, Node.js fs/promises, matter.js (YAML解析)

---

## 1. 调查问题

### Task 1: 对比 saveFile 和 renameFile 的实现差异

**Files:**
- Modify: `electron/ipc/file.cjs:71-99`
- Reference: `electron/common/utils/fileHelper.js`

- [ ] **Step 1: 查看 saveFile 完整实现**

```javascript
// electron/ipc/file.cjs 第 71-88 行
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
```

- [ ] **Step 2: 查看 renameFile 完整实现**

```javascript
// electron/ipc/file.cjs 第 90-99 行
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
```

- [ ] **Step 3: 对比分析**

| 对比项 | saveFile | renameFile |
|--------|----------|------------|
| 文件操作 | `fs.writeFile` (新建) | `fs.rename` (重命名) |
| 目标文件 | 不存在 | 已存在 |
| 错误类型 | 无 | 待确认 |

**关键发现**：`saveFile` 使用 `fs.writeFile` 创建新文件，`renameFile` 使用 `fs.rename` 重命名已有文件。如果已有文件权限不足，`rename` 会失败。

- [ ] **Step 4: 添加日志确认错误来源**

在 `electron/ipc/file.cjs` 第 90-99 行的 `renameFile` 中添加更详细的日志：

```javascript
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
```

- [ ] **Step 5: 在 updateYaml 中添加相同日志**

```javascript
// electron/ipc/file.cjs 第 101-124 行
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
```

- [ ] **Step 6: 提交调查代码**

```bash
git add electron/ipc/file.cjs
git commit -m "debug: add detailed logs to renameFile and updateYaml"
```

---

### Task 2: 启动项目并复现问题

**Files:**
- Test: 在 MindMap 中选中节点 → F2 修改名称 → 确认触发哪个 API 报错

- [ ] **Step 1: 启动项目**

```bash
pnpm start
```

- [ ] **Step 2: 复现步骤**
1. 在 MindMap 中选中一个已有节点
2. 按 F2 修改名称
3. 输入新名称后点击确定
4. 观察控制台输出

- [ ] **Step 3: 确认错误来源**

根据控制台日志，确认是 `renameFile` 报错还是 `updateYaml` 报错：
- 如果 `renameFile` 报错：检查源文件是否存在、权限问题
- 如果 `updateYaml` 报错：检查文件是否被锁定、权限问题

- [ ] **Step 4: 检查文件实际权限**

```bash
ls -la /Users/antvictor/All/learn/nodes/*.md | head -20
```

- [ ] **Step 5: 提交复现结果**

根据调查结果更新后续修复方案。

---

## 2. 修复问题

修复方案将根据调查结果显示：

**如果问题是文件权限不足**（新创建的文件有权限，已有文件无权限）：

- [ ] **方案 A: 修复文件权限**
  - 检查并修复 `/Users/antvictor/All/learn/nodes/` 目录下所有 `.md` 文件的权限
  - 使用 `chmod` 命令确保文件可读写

**如果问题是 API 实现问题**：

- [ ] **方案 B: 统一使用 writeFile 替代 rename**
  - 在 `renameFile` 中使用 `fs.copyFile` + `fs.unlink` 替代 `fs.rename`
  - 这样可以绕过某些文件系统对 `rename` 的限制

**如果问题是文件被锁定**：

- [ ] **方案 C: 添加文件锁定检测**
  - 在操作前检查文件是否被其他进程锁定
  - 如果被锁定，等待或提示用户关闭占用文件的应用

---

## 执行选项

**1. Subagent-Driven (recommended)** - 任务分批执行，每批完成后检查点

**2. Inline Execution** - 当前 session 连续执行

**选择哪个方式？**