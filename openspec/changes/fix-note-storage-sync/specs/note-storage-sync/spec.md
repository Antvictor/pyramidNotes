## ADDED Requirements

### Requirement: 启动与切换存储目录时双向对账
系统 SHALL 在应用启动时以及存储目录变更时，扫描存储目录顶层的 `.md` 文件并与 `notes` 表对账，使文件侧与数据库侧收敛到同一状态。对账 SHALL 覆盖「数据库有行但文件已不存在」与「文件存在但数据库无行」两个方向。`.delete/`、`attachment/` 等子目录与非 `.md` 文件（含 `.data`）MUST 被忽略。

#### Scenario: 文件存在但数据库无行
- **WHEN** 存储目录顶层新增一个 frontmatter 带 `id` 的 `.md` 文件，且该 `id` 不在 `notes` 表中
- **THEN** 系统为该文件插入一行 `notes` 记录，`delete` 为 0，并使其在脑图上可见

#### Scenario: 数据库有行但文件已不存在
- **WHEN** 一个 `delete = 0` 的 `notes` 行的笔记文件已被移出存储目录
- **THEN** 系统删除该行，且其 FTS 索引同步移除

#### Scenario: 子目录与非 markdown 文件不参与对账
- **WHEN** 存储目录下存在 `.delete/`、`attachment/` 子目录与 `.data` 数据库文件
- **THEN** 对账过程不读取也不修改这些路径

### Requirement: frontmatter 值 SHALL 被规整为字符串
系统 SHALL 在写入 `notes` 表前把 frontmatter 解析出的 `id`、`name`、`alias`、`top`、`left` 规整为字符串；`undefined`、`null` 与空字符串 SHALL 统一写为 `NULL`，其余值 SHALL 经 `String()` 转换。系统 MUST NOT 把非字符串标量直接绑定到 TEXT 列。

#### Scenario: 不带引号的数字型 top
- **WHEN** 文件的 frontmatter 为 `top: 1`（YAML 解析为数字）
- **THEN** 数据库中该行 `top` 为字符串 `'1'`，而不是 `'1.0'`，该节点可被其父节点 `id = '1'` 挂载并显示

#### Scenario: 数字 0 作为根标记
- **WHEN** 文件的 frontmatter 为 `top: 0`（YAML 解析为数字 0）
- **THEN** 数据库中该行 `top` 为字符串 `'0'`，且该节点被识别为根节点

#### Scenario: 空字符串字段
- **WHEN** 文件的 frontmatter 为 `left: ""`
- **THEN** 数据库中该行 `left` 为 `NULL`

#### Scenario: 数字型 title 与 id
- **WHEN** 文件的 frontmatter 为 `title: 2024` 或 `id: 123`
- **THEN** 数据库中存为字符串 `'2024'` 或 `'123'`，不含小数点后缀

#### Scenario: 已存在的脏数据被修复
- **WHEN** 数据库中某行的 `top` 已是 `'1.0'`，或 `content` 含 `---` frontmatter
- **THEN** 对账时该行被更新为规整后的值与纯正文内容

### Requirement: 导入的正文 SHALL 排除 frontmatter
系统 SHALL 只把 markdown 正文写入 `notes.content`。frontmatter 部分 MUST NOT 进入 `content`，以保证全文检索、搜索摘要与反链搜索不命中元数据。

#### Scenario: 导入带 frontmatter 的文件
- **WHEN** 一个 `.md` 文件被对账导入
- **THEN** `notes.content` 等于去掉 frontmatter 后的正文，不含起始的 `---` 分隔块

### Requirement: 回归存储目录的软删除笔记 SHALL 自动恢复
当某笔记的 `notes` 行 `delete = 1`（曾被移入回收站），而其对应文件重新出现在存储目录顶层时，系统 SHALL 把该行恢复为 `delete = 0` 并刷新其字段。

#### Scenario: 文件被手动放回目录
- **WHEN** 用户把回收站中的笔记文件复制回存储目录顶层
- **THEN** 该行 `delete` 变为 0，节点在脑图上重新可见

### Requirement: 无 id 的文件 SHALL 被报告而非静默忽略
系统 SHALL 跳过 frontmatter 缺少 `id` 的文件，并 SHALL 输出包含文件名的告警日志。系统 MUST NOT 静默丢弃这类文件。

#### Scenario: 缺少 id 的文件
- **WHEN** 存储目录中存在一个 frontmatter 只有 `title` 而没有 `id` 的 `.md` 文件
- **THEN** 该文件不产生 `notes` 行，且日志中出现包含其文件名的跳过原因

### Requirement: 根节点 SHALL 永不被硬删除
硬删除阶段 MUST 保护 `id = '1'` 或 `top = '0'` 的行，即使其对应文件不在存储目录中。系统 MUST NOT 依赖单独的 `top` 字段判定根节点。

#### Scenario: 根文件缺失
- **WHEN** 数据库中根行的 `top` 因历史缺陷为 `NULL`，且根文件不在存储目录中
- **THEN** 该根行不被删除

#### Scenario: 非根行缺少文件
- **WHEN** 一个 `delete = 0` 且既不是 `id = '1'` 也不是 `top = '0'` 的行，其文件不在存储目录中
- **THEN** 该行被删除

### Requirement: 目录中没有 markdown 时 SHALL 跳过删除阶段
当存储目录顶层没有任何 `.md` 文件时，系统 SHALL 跳过硬删除阶段并输出告警，以避免存储盘未挂载或云同步未完成时清空数据库。

#### Scenario: 存储目录为空
- **WHEN** 存储目录顶层一个 `.md` 文件都没有，而 `notes` 表中存在 `delete = 0` 的行
- **THEN** 数据库行数不变，且日志中出现跳过删除阶段的告警

#### Scenario: 目录恢复后再启动
- **WHEN** 文件被放回存储目录后应用再次启动
- **THEN** 对账正常执行，缺失文件的孤儿行被清除

### Requirement: 不可达父节点的可见笔记 SHALL 重挂到最近的可见祖先
对于 `delete = 0` 的笔记，若其 `top` 既不是根标记 `'0'`、也不指向任一可见节点（父 id 不存在或父在回收站），系统 SHALL 沿数据库的 `top` 链上溯，把其 `top` 改为遇到的第一个可见祖先的 id，并输出告警。上溯 SHALL 能穿过多层已软删或已失踪的父节点。仅当整条祖先链都不包含可见节点时，才 SHALL 回退到根节点 id。上溯 MUST 在祖先链成环时终止，不得死循环。

#### Scenario: 父节点在回收站但祖父可见
- **WHEN** 某笔记的 `top` 指向一个已软删（`delete = 1`）的父节点，而该父节点的 `top` 指向一个可见节点
- **THEN** 该笔记的 `top` 被改为那个可见祖先的 id，MUST NOT 被改为根节点 id

#### Scenario: 祖先链中间有多层已删除节点
- **WHEN** 某笔记的 `top` 指向 `t2`，`t2` 的 `top` 指向 `t1`，`t1` 与 `t2` 均已软删，而 `t1` 的 `top` 指向根节点
- **THEN** 该笔记的 `top` 被改为根节点 id

#### Scenario: 祖先链成环
- **WHEN** `t1` 的 `top` 指向 `t2` 且 `t2` 的 `top` 指向 `t1`，二者均不可见
- **THEN** 上溯终止并回退到根节点 id，过程不得挂起

#### Scenario: 父节点 id 不存在且没有可用祖先
- **WHEN** 某笔记的 `top` 指向一个数据库与目录里都不存在的 id
- **THEN** 该笔记的 `top` 被改为根节点 id，且在脑图上可见

#### Scenario: 根节点 id 不是 1
- **WHEN** 存储目录中的根节点文件使用 `id: "zho01root001"` 与 `top: "0"`
- **THEN** 不可达父节点的笔记被重挂到 `'zho01root001'`，而不是 `'1'`

#### Scenario: 没有可用根节点
- **WHEN** 对账结果中不存在任何根节点
- **THEN** 系统不重挂任何节点，只输出告警，交由渲染侧的「无根则新建根并收编孤儿」逻辑处理

### Requirement: 重挂修正 SHALL 回写文件
当对账为某笔记修正了不可达的 `top` 时，系统 SHALL 把修正后的值写回该笔记的 `.md` 文件，并 SHALL 保留该文件其它的 frontmatter 字段与正文。系统 MUST NOT 让文件长期保留已被判定为不可达的 `top`。

#### Scenario: 首次启动修正并回写
- **WHEN** 某笔记文件中的 `top` 指向一个不可达的节点，对账为它算出了新的 `top`
- **THEN** 该文件中的 `top` 被更新为修正后的值，其余 frontmatter 字段与正文保持不变

#### Scenario: 后续启动不再重复修正
- **WHEN** 上述修正已写回文件后应用再次启动
- **THEN** 对账不再为该笔记产生重挂告警，也不修改数据库与文件

#### Scenario: 回写失败不阻断启动
- **WHEN** 回写某个文件时抛出异常
- **THEN** 异常被记录为告警，其余笔记的对账与回写继续，应用正常启动

### Requirement: 删除节点提升子节点时 SHALL 同时更新文件
当删除流程把被删节点的直接子节点提升到上一级时，系统 SHALL 同时更新数据库记录与这些子节点对应的 `.md` 文件，使二者对同一 `top` 保持一致。系统 MUST NOT 只更新数据库而使文件留有过期的 `top`。

#### Scenario: 删除父节点后文件被同步更新
- **WHEN** 用户删除一个有子节点的节点并选择「仅删除父节点」，子节点被提升到上一级
- **THEN** 每个子节点的 `.md` 文件中的 `top` 被更新为提升后的父节点 id

#### Scenario: 提升后的下次启动对账不改变结构
- **WHEN** 完成上述删除后应用重启并对账
- **THEN** 这些子节点的 `top` 保持不变，MUST NOT 被改挂到其它节点

### Requirement: 对账写入 SHALL 在单个事务内完成
所有插入、更新与删除 SHALL 在一个数据库事务中执行，以避免部分写入导致文件与数据库不一致。

#### Scenario: 对账过程中出现异常
- **WHEN** 对账事务中任一语句失败
- **THEN** 整批变更回滚，数据库保持对账前状态

### Requirement: 对账后的清理失败 MUST NOT 阻断启动
对账完成后的回收站保留期清理与孤儿附件清理 SHALL 各自捕获异常并记录错误，MUST NOT 使应用启动失败。

#### Scenario: 附件清理抛出异常
- **WHEN** `sweepUnreferencedAttachments()` 抛出异常
- **THEN** 异常被捕获并记录，应用继续启动，对账结果保持已提交状态

### Requirement: 打开笔记的文件缺失兜底 SHALL 按 id 前缀匹配
当请求的文件名在存储目录中不存在时，系统 SHALL 通过比对候选文件 frontmatter 中的 `id` 是否构成请求文件名的 `id-` 前缀来定位文件。系统 MUST NOT 通过按 `-` 切分文件名来反推 id，因为 id 自身可以包含 `-`。

#### Scenario: 节点 id 含连字符
- **WHEN** 笔记的 id 为 `zbysv-KrUE3M`，其文件名为 `zbysv-KrUE3M-旧标题.md`，而渲染侧请求的是 `zbysv-KrUE3M-新标题.md`
- **THEN** 兜底逻辑命中该文件并成功打开，而不是因切分出的 id `zbysv` 而失败

#### Scenario: 找不到对应文件
- **WHEN** 请求的文件名不匹配存储目录中任何文件的 id 前缀
- **THEN** 系统返回文件不存在的错误，且 MUST NOT 打开其它笔记的文件
