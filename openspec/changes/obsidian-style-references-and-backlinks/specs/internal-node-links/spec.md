## MODIFIED Requirements

### Requirement: Internal Link Syntax

引用 SHALL 以节点 id 为唯一关联键；显示名 SHALL 在渲染时从目标节点动态派生。

#### Scenario: 完成弹窗插入新引用
- WHEN 用户通过完成弹窗插入引用
- THEN markdown 序列化为 `[[节点ID]]`，不含显示名

#### Scenario: 显式别名保留
- WHEN 引用包含 `|别名` 且别名不等于 id
- THEN 序列化保留 `[[id|别名]]` 格式

#### Scenario: 动态显示
- WHEN 被引用节点存在
- THEN 显示该节点当前名称（与存储文本无关）

#### Scenario: 目标缺失
- WHEN 被引用节点不存在
- THEN 以缺失样式显示存储文本（`name` 或 id）

### Requirement: Legacy Name-only References

name-only 引用 SHALL 不再按名称解析。

#### Scenario: 手动输入名称引用
- WHEN 用户输入 `[[某节点名]]` 且无对应 id
- THEN 显示为缺失样式链接，不可跳转

## ADDED Requirements

### Requirement: Backlink Panel

编辑页 SHALL 在底部显示引用当前笔记的笔记列表。

#### Scenario: 有反链
- WHEN 当前笔记被其他笔记引用（`[[id|…]]` 或 `[[id]]`）
- THEN 底部面板显示"被 N 篇笔记引用"及笔记名按钮，点击跳转

#### Scenario: 无反链
- WHEN 无任何笔记引用当前笔记
- THEN 面板不渲染
