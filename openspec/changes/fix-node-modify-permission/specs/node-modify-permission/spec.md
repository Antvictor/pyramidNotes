## ADDED Requirements

### Requirement: 修改节点名称应正常保存
修改节点名称时调用 `renameFile` 和 `updateYaml` API 应成功完成，不应出现权限错误。

#### Scenario: 正常修改节点名称
- **WHEN** 用户在 OpenPrompt 输入框中修改节点名称后点击确定
- **THEN** 系统调用 `editNode` 函数，更新数据库、重命名文件、更新 YAML 元数据
- **AND** 不出现权限错误提示

#### Scenario: 修改后文件名应正确
- **WHEN** 节点 ID 为 `EGGMR7ObSCp-`，原名称为 `test1`，新名称为 `newName`
- **THEN** 文件从 `EGGMR7ObSCp--test1.md` 重命名为 `EGGMR7ObSCp--newName.md`
- **AND** YAML 中的 title 字段更新为 `newName`

### Requirement: 权限错误处理
当发生权限错误时，系统应显示明确的错误提示，并提供重试或选择其他目录的选项。

#### Scenario: 文件重命名权限错误
- **WHEN** 调用 `renameFile` API 时发生权限错误
- **THEN** 显示权限错误提示
- **AND** 提供"选择其他目录"或"重试"选项

#### Scenario: YAML 更新权限错误
- **WHEN** 调用 `updateYaml` API 时发生权限错误
- **THEN** 显示权限错误提示
- **AND** 提供"选择其他目录"或"重试"选项