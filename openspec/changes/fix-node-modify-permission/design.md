## Context

修改节点名称时提示"没有系统权限"，但新增节点和保存笔记都正常工作。

**当前代码流程对比：**

| 操作 | 函数 | API 调用 |
|------|------|----------|
| 新增节点 | `insertNode` | `saveFile` |
| 修改节点 | `editNode` | `renameFile` + `updateYaml` |

新增正常工作，修改异常，差异在于使用的 API 不同。

## Goals / Non-Goals

**Goals:**
- 定位 `renameFile` 或 `updateYaml` 中的权限校验问题
- 修复修改节点时的权限错误

**Non-Goals:**
- 不修改 `saveFile` 等正常工作的 API
- 不改动权限校验的核心逻辑（除非是 bug）

## Decisions

需要对比以下函数的权限校验逻辑：
1. `window.api.saveFile` - 工作正常
2. `window.api.renameFile` - 可能有问题
3. `window.api.updateYaml` - 可能有问题

## Risks / Trade-offs

- 权限错误可能发生在 Electron 进程，需要查看 electron 侧代码
- 如果是系统级权限问题（如文件系统权限），修复可能涉及 Electron 配置

## Open Questions

1. 权限错误的具体原因是什么？（文件不存在？API 未授权？）
2. `renameFile` 和 `updateYaml` 在 electron 侧的实现在哪里？
3. 是否有日志可以查看错误详情？