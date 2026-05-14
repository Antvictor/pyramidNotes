## 1. 建立通用工具层 `common/utils`

- [x] 1.1 创建 `electron/common/utils/` 目录结构
- [x] 1.2 创建 `electron/common/utils/errorCodes.js` - 定义错误码常量（EACCES, ENOENT, UNKNOWN 等）
- [x] 1.3 创建 `electron/common/utils/fileHelper.js` - 文件操作辅助函数（resolveStoragePath, checkFilePermission, classifyError 等）

## 2. 修复文件操作路径问题

- [x] 2.1 修改 `fileHelper.js` 中的 `resolveStoragePath()` 使用动态路径解析
- [x] 2.2 修改 `electron/ipc/file.cjs` 引入 `fileHelper.js` 和 `errorCodes.js`
- [x] 2.3 移除 `registerFileIPC()` 顶部的 `const dataPath = getDataPath();` 闭包捕获
- [x] 2.4 将 `resolveStoragePath()` 调用移入 `openFile` 处理器内部
- [x] 2.5 将 `resolveStoragePath()` 调用移入 `saveFile` 处理器内部
- [x] 2.6 将 `resolveStoragePath()` 调用移入 `deleteFile` 处理器内部
- [x] 2.7 将 `resolveStoragePath()` 调用移入 `renameFile` 处理器内部
- [x] 2.8 将 `resolveStoragePath()` 调用移入 `updateYaml` 处理器内部

## 3. 改进错误处理

- [x] 3.1 在 `fileHelper.js` 中实现 `classifyError()` 函数，根据错误类型返回对应的错误码
- [x] 3.2 修改 `openFile` 使用 `classifyError()` 统一错误处理
- [x] 3.3 修改 `saveFile` 使用 `classifyError()` 统一错误处理
- [x] 3.4 修改 `deleteFile` 使用 `classifyError()` 统一错误处理
- [x] 3.5 修改 `renameFile` 使用 `classifyError()` 统一错误处理
- [x] 3.6 修改 `updateYaml` 使用 `classifyError()` 统一错误处理

## 4. 权限获取功能

- [x] 4.1 在 `errorCodes.js` 中定义 `EACCES` 和 `ENOENT` 等错误码
- [x] 4.2 在 `fileHelper.js` 中实现 `checkFilePermission()` 检测文件权限
- [x] 4.3 在 preload.cjs 中暴露 `openSystemSettings` 方法
- [x] 4.4 在主进程添加 `openSystemSettings` IPC 处理器
- [x] 4.5 在前端 MindMap.jsx 中添加权限获取弹窗组件
- [x] 4.6 弹窗提供"重新选择文件夹"和"打开系统设置"两个选项
