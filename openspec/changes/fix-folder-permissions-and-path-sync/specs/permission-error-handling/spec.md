## ADDED Requirements

### Requirement: 文件操作错误处理
文件操作 IPC 处理器 SHALL 捕获并妥善处理文件操作中的错误，包括但不限于权限不足、路径不存在等场景。

#### Scenario: saveFile 遇到权限不足错误
- **WHEN** 用户尝试保存文件到无写入权限的目录
- **THEN** saveFile 返回 false，前端显示错误提示

#### Scenario: openFile 遇到文件不存在错误
- **WHEN** 用户尝试打开一个不存在的文件
- **THEN** openFile 返回 null，前端显示文件不存在提示

#### Scenario: openFile 遇到权限不足错误
- **WHEN** 用户尝试读取无读取权限的文件
- **THEN** openFile 返回 null，前端显示权限错误提示

#### Scenario: deleteFile 遇到权限不足错误
- **WHEN** 用户尝试删除无删除权限的文件
- **THEN** deleteFile 返回 false，前端显示权限错误提示

#### Scenario: renameFile 遇到路径不存在错误
- **WHEN** 用户尝试重命名文件时目标路径不存在
- **THEN** renameFile 返回 false，前端显示路径不存在错误提示
