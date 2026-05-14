## ADDED Requirements

### Requirement: 权限不足时提示用户获取权限
当文件操作遇到权限不足错误时，系统 SHALL 返回特定错误码，前端 SHALL 显示弹窗询问用户选择"重新选择文件夹"或"打开系统设置授予权限"。

#### Scenario: saveFile 遇到权限不足错误
- **WHEN** 用户尝试保存文件到无写入权限的目录
- **THEN** saveFile 返回错误码 `EACCES`，前端显示权限获取弹窗

#### Scenario: openFile 遇到权限不足错误
- **WHEN** 用户尝试读取无读取权限的文件
- **THEN** openFile 返回错误码 `EACCES`，前端显示权限获取弹窗

### Requirement: 权限获取弹窗交互
前端显示的权限获取弹窗 SHALL 提供两个选项让用户选择操作方式。

#### Scenario: 用户选择"重新选择文件夹"
- **WHEN** 权限获取弹窗中用户点击"重新选择文件夹"按钮
- **THEN** 关闭弹窗，打开系统文件夹选择对话框，让用户重新选择有权限的文件夹

#### Scenario: 用户选择"打开系统设置"
- **WHEN** 权限获取弹窗中用户点击"打开系统设置"按钮
- **THEN** 关闭弹窗，使用 shell.openPath 打开系统偏好设置中当前应用的权限设置页面

### Requirement: 用户在系统设置授予权限后重新尝试操作
用户授予权限后，系统 SHALL 重新尝试验证权限并执行之前的操作。

#### Scenario: 用户授予权限后 saveFile 成功
- **WHEN** 用户在系统设置授予存储文件夹读写权限后重新保存文件
- **THEN** saveFile 操作成功执行，返回 true
