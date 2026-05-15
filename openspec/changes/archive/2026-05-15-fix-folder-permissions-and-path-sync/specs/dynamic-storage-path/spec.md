## ADDED Requirements

### Requirement: 文件操作使用动态存储路径
所有文件操作 IPC 处理器 SHALL 使用当前设置的 storagePath，而非启动时捕获的静态路径。

#### Scenario: 启动后更改存储文件夹，saveFile 使用新路径
- **WHEN** 用户在设置中将 storagePath 从 `/old/path` 改为 `/new/path`，然后保存节点
- **THEN** saveFile 操作将文件写入 `/new/path` 目录下的对应文件

#### Scenario: 启动后更改存储文件夹，openFile 使用新路径
- **WHEN** 用户在设置中将 storagePath 从 `/old/path` 改为 `/new/path`，然后打开节点
- **THEN** openFile 操作从 `/new/path` 目录读取文件

#### Scenario: 启动后更改存储文件夹，deleteFile 使用新路径
- **WHEN** 用户在设置中将 storagePath 从 `/old/path` 改为 `/new/path`，然后删除节点
- **THEN** deleteFile 操作从 `/new/path` 目录删除文件

#### Scenario: 启动后更改存储文件夹，renameFile 使用新路径
- **WHEN** 用户在设置中将 storagePath 从 `/old/path` 改为 `/new/path`，然后重命名节点
- **THEN** renameFile 操作在 `/new/path` 目录下执行重命名

#### Scenario: 启动后更改存储文件夹，updateYaml 使用新路径
- **WHEN** 用户在设置中将 storagePath 从 `/old/path` 改为 `/new/path`，然后更新节点元数据
- **THEN** updateYaml 操作在 `/new/path` 目录的文件上执行更新
