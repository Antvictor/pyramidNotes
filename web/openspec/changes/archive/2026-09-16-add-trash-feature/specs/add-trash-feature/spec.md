# add-trash-feature Specification

## Purpose

为 pyramidNotes 增加应用内回收站：删除的节点可查看、可恢复，超过保留期自动彻底删除；
并支持"系统回收站"与"彻底删除"两种额外模式。

## Requirements

### Requirement: 软删除到回收站

节点删除时，系统 SHALL 在 `notes` 表标记 `"delete"=1` 并记录 `last_up_time`，
对应 Markdown 文件 SHALL 移动到 `{storagePath}/.delete/`。

### Requirement: 三种删除模式

系统 SHALL 支持三种删除模式：`trash`（应用回收站）、`systemTrash`（系统回收站）、`permanent`（彻底删除）。
`systemTrash` SHALL 将文件移入系统回收站并直接删除数据库记录；
`permanent` SHALL 直接删除文件（不经系统回收站）并删除数据库记录；
两者 SHALL NOT 在应用回收站留下条目。

### Requirement: 回收站查看与恢复

回收站页面 SHALL 按「删除簇顶层」（`"delete"=1` 且父节点非 `"delete"=1`）列出条目，
展示节点名称与删除日期。恢复 SHALL 恢复顶层节点及其所有 `"delete"=1` 后代，并将文件移回数据目录。

### Requirement: 保留期清理

系统 SHALL 支持可配置的保留期（默认 30 天）。
启动时 SHALL 彻底删除 `"delete"=1` 且 `last_up_time` 超过保留期的记录及其 `.delete/` 中的文件。

### Requirement: 查询过滤

所有节点查询（列表、节点名搜索、全文搜索、反链面板）SHALL 排除 `"delete"=1` 的记录。

### Requirement: 选择彻底删除需警告

在设置中选择"彻底删除"模式时，系统 SHALL 弹出警告并在用户确认后才切换。

### Requirement: 根节点保留

根节点 SHALL NOT 被删除或进入回收站；删除根节点 SHALL 递归删除其所有子孙节点，根节点本身保留。
