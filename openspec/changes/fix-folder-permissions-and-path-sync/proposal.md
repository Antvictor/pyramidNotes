## Why

用户在设置中更改存储文件夹后，新增节点、打开文件等操作仍然使用启动时配置的旧文件夹路径，导致操作失败。同时，当用户选择的文件夹没有正确的文件系统权限时，应用程序没有适当的错误处理和权限请求机制。如果用户没有操作该文件夹的权限，需要提示用户给予权限。

此外，当前代码中错误码硬编码在各 IPC 处理器中，文件路径解析逻辑分散，违反最小知道原则（Principle of Least Knowledge）。需要建立通用工具层，实现功能模块间解耦。

问题根源：`electron/ipc/file.cjs` 中的 `dataPath` 在模块加载时捕获一次，而非动态获取当前设置路径。

## What Changes

1. **建立通用工具层**：在 `electron/common/utils/` 下建立 `errorCodes.js` 和 `fileHelper.js`，集中管理错误码和文件操作辅助函数
2. **动态路径解析**：修复文件操作使用静态缓存路径的问题，改为每次操作时动态获取当前设置的存储路径
3. **权限错误处理**：为文件操作添加适当的错误处理，捕获并妥善处理权限相关错误
4. **权限获取**：当检测到用户没有操作文件夹的权限时，提示用户给予权限或选择新的文件夹
5. **设置变更通知**：当用户在设置中更改存储文件夹时，通知前端刷新状态

## Capabilities

### New Capabilities

- `common-utils`: 通用工具层能力，提供错误码定义和文件操作辅助函数，遵循最小知道原则
- `dynamic-storage-path`: 动态存储路径解析能力，确保所有文件操作使用当前设置的存储路径
- `permission-error-handling`: 权限错误处理能力，捕获并处理文件操作中的权限错误
- `permission-acquisition`: 权限获取能力，当检测到权限不足时提示用户给予权限或选择新文件夹

### Modified Capabilities

- 无 - 本次为纯修复性变更，不改变现有功能的行为契约

## Impact

- `electron/common/utils/errorCodes.js` - 新建文件，定义错误码常量
- `electron/common/utils/fileHelper.js` - 新建文件，提供文件操作辅助函数
- `electron/ipc/file.cjs` - 修改文件操作 IPC 处理器，使用动态路径和通用错误处理
- `electron/ipc/userPath.cjs` - 路径解析逻辑可能需要调整
- `electron/ipc/settings.cjs` - 当设置变更时可能需要通知其他模块
- `web/src/pages/settings/Settings.jsx` - 设置页面需要感知路径变更并反馈给用户
- `electron/ipc/file.cjs` - 添加权限检测和获取逻辑
