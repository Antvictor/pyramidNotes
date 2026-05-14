## Context

当前实现中，`electron/ipc/file.cjs` 的 `registerFileIPC()` 函数在模块加载时捕获 `dataPath`：

```javascript
function registerFileIPC() {
    const dataPath = getDataPath();  // 启动时捕获一次
    // 所有文件操作使用这个静态值
}
```

这导致用户在设置中更改存储文件夹后，文件操作仍使用旧路径，直到应用重启。

`getDataPath()` 本身已经从 `getCachedSettings()` 动态读取路径，问题仅在于调用时机。

**架构问题**：当前代码中错误码硬编码在各 IPC 处理器中，文件路径解析逻辑分散，违反最小知道原则（Principle of Least Knowledge）。

## Goals / Non-Goals

**Goals:**
- 文件操作（openFile、saveFile、deleteFile、renameFile、updateYaml）使用动态路径
- 当用户更改存储文件夹时，已加载的 IPC 处理器使用新路径
- 文件操作失败时返回有意义的错误信息，特别是权限相关错误
- 当检测到权限不足时，提示用户给予权限或选择新的文件夹
- 建立通用工具层，遵循最小知道原则：功能模块间解耦，共享逻辑放入 `common/utils`

**Non-Goals:**
- 不改变设置存储的结构或位置
- 不改变前端与后端的 IPC 通信协议
- 不实现 macOS Gatekeeper 层面的权限申请（仅处理文件系统权限）

## Decisions

### Decision 1: 建立通用工具层 `common/utils`

**选择**：在 `electron/common/utils/` 目录下建立独立的工具模块：
- `errorCodes.js` - 错误码常量定义
- `fileHelper.js` - 文件操作的通用辅助函数

**原因**：
- 遵循最小知道原则：IPC 处理器不应知道其他 IPC 处理器的存在
- 错误码统一管理，便于维护和扩展
- 文件路径解析逻辑集中，便于复用和测试

**目录结构**：
```
electron/common/utils/
├── errorCodes.js    # 错误码常量：EACCES, ENOENT 等
└── fileHelper.js    # 文件操作辅助函数：resolveStoragePath, checkFilePermission 等
```

### Decision 2: 移除 dataPath 闭包捕获

**选择**：将 `getDataPath()` 调用从 `registerFileIPC()` 顶部移入每个 IPC 处理器内部，改用 `fileHelper.js` 中的 `resolveStoragePath()` 函数。

**原因**：
- `resolveStoragePath()` 本身已是动态的（读取 `getCachedSettings()`）
- 只需改变调用时机，在每次操作时动态获取
- 最小化代码改动，无需引入事件系统或复杂的订阅机制

**替代方案考虑**：
- 事件订阅机制：当设置变更时发布事件，文件操作订阅 - 过于复杂
- 每次从 settings 重新加载 - 仍有缓存，无需额外 I/O

### Decision 3: 统一错误处理

**选择**：各文件操作保留各自的 try/catch，但统一使用 `errorCodes.js` 中定义的错误码，并通过 `fileHelper.js` 中的辅助函数统一处理错误分类。

**原因**：不同操作（读、写、重命名、删除）失败原因不同，分别处理更清晰，但错误码和分类逻辑统一。

### Decision 4: 权限检测与获取

**选择**：在检测到权限不足错误时，返回特定错误码给前端，前端弹窗询问用户是"重新选择文件夹"还是"尝试打开系统设置授予权限"。

**原因**：
- Electron 无法直接修改 macOS 权限（需要用户手动在系统设置中操作）
- 返回错误信息而非直接弹系统对话框，可以让用户选择重新选择有权限的文件夹
- 前端弹窗提供更友好的交互方式

**替代方案考虑**：
- 直接调用 `shell.openPath()` 打开系统设置 - 用户需要手动找到对应应用并授予权限，体验较差
- 使用 `electron` 的 `security::entat` 来请求权限 - macOS 不支持这种方式

## Risks / Trade-offs

[Risk] 用户选择了不存在的文件夹路径 → [Mitigation] 应用启动时验证路径存在性，文件操作时捕获 ENOENT 错误返回友好提示

[Risk] 用户取消了文件夹选择（dialog.canceled） → [Mitigation] 设置页面已处理 null 情况，不保存空路径

[Risk] 权限不足导致文件操作失败 → [Mitigation] 捕获错误并返回特定错误码（如 `EACCES`），前端弹窗询问用户选择"重新选择文件夹"或"打开系统设置"

[Risk] 用户授予权限后仍失败（文件夹被移动或删除） → [Mitigation] 每次操作前验证路径存在性，路径不存在时返回 `ENOENT` 错误码

[Risk] 未来需要添加新的错误码类型 → [Mitigation] `common/utils/errorCodes.js` 集中管理所有错误码，便于扩展

[Risk] 文件操作逻辑分散在多个 IPC 处理器中 → [Mitigation] `common/utils/fileHelper.js` 集中提供通用文件操作辅助函数
