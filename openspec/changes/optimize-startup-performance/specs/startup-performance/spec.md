## ADDED Requirements

### Requirement: FTS 索引 SHALL 按需回填

系统 SHALL 只在「`notes_fts` 本次刚创建且 `notes` 有数据」或「`notes_fts` 与 `notes` 行数不一致」时执行全量回填；其余启动 SHALL 依赖 `notes_ai` / `notes_au` / `notes_ad` 触发器增量同步。全量回填 MUST NOT 出现在数据一致的常规启动路径上。

#### Scenario: 常规启动

- **WHEN** 索引表已存在且与 `notes` 行数一致，应用启动
- **THEN** 不执行 `DELETE FROM notes_fts` / 全量 `INSERT ... SELECT`

#### Scenario: 历史库升级或损坏恢复

- **WHEN** 索引表在本次初始化中刚创建，且 `notes` 表已有行
- **THEN** 执行一次全量回填，此后由触发器维护

#### Scenario: 行数不一致

- **WHEN** `notes_fts` 行数与 `notes` 不一致
- **THEN** 执行一次全量回填修复索引

#### Scenario: 日常编辑

- **WHEN** 用户新增、修改或删除笔记
- **THEN** 对应触发器增量同步索引，无需重建

### Requirement: 窗口 SHALL 先于全盘对账出现

系统 SHALL 在数据库打开后立即创建窗口并注册 IPC；笔记文件扫描、双向对账、回收站清理与孤儿附件清理 SHALL 在首帧之后后台执行。对账结束时 MUST 向渲染进程发送一次完成通知：成功携带节点/回收站数量，失败携带错误信息且窗口 MUST NOT 因此关闭。启动对账 MUST 单飞执行。

#### Scenario: 对账晚于首帧

- **WHEN** 应用启动
- **THEN** 窗口先出现；文件扫描与对账随后在后台完成，完成后发送 `notes:reconciled`

#### Scenario: 对账期间的外部变更

- **WHEN** 对账在启动后导入或修复了节点（例如外部修改了 `.md`）
- **THEN** 渲染进程收到通知后重读节点列表，仅在图结构变化（`id/top/left/name/sort`）时刷新视图

#### Scenario: 对账失败

- **WHEN** 对账过程抛出错误
- **THEN** 记录日志、窗口保持可用，并仍发送带 `error` 的完成通知

#### Scenario: 对账早于渲染进程订阅

- **WHEN** 对账在渲染进程注册监听之前完成
- **THEN** 渲染进程挂载时 SHALL 能拉取到「已完成」状态，建根守卫因此解除，空库时仍可创建根节点

#### Scenario: 空库但目录有文件

- **WHEN** 数据库为空而存储目录存在 `.md` 文件，且对账尚未完成
- **THEN** 渲染进程 MUST NOT 抢先创建根节点，待完成通知后再决定是否建根

#### Scenario: 对账期间的写入

- **WHEN** 启动对账尚未结束，用户新建节点（渲染端先写数据库、后写文件）
- **THEN** 该写入 SHALL 在对账结束后才执行，新节点 MUST NOT 被对账当作无文件的孤儿删除

#### Scenario: 切换存储目录

- **WHEN** 用户在设置中切换存储目录
- **THEN** 关闭旧库前等待在途启动对账结束，切换流程仍等待对账完成后才通知前端刷新

### Requirement: 脑图首帧 SHALL 只渲染聚焦根的前三层

脑图首次获得节点数据时 SHALL 直接以「聚焦根 + 前三层」的可见集合渲染；初始化后的可见集合 SHALL 与首帧完全一致。系统 MUST NOT 先对全图布局并挂载、再收缩到前三层。

#### Scenario: 首次启动

- **WHEN** 应用启动并首次加载节点数据
- **THEN** 首帧只出现根与前两层子节点，其后不因初始化而收缩

#### Scenario: 聚焦模式

- **WHEN** 脑图处于聚焦模式
- **THEN** 首帧以聚焦节点为根计算前三层

#### Scenario: 初始化一致性

- **WHEN** 初始化 effect 写入已加载集合
- **THEN** 可见节点集合与首帧相同，画面不发生可见变化

#### Scenario: 缺少根节点

- **WHEN** 数据中不存在根节点
- **THEN** 维持旧兜底：先显示现有节点，由建根逻辑在允许时创建根并收编孤儿

### Requirement: 脑图列表查询 MUST NOT 传输正文

脑图读取节点列表时，系统 SHALL 只查询 `id`、`name`、`alias`、`top`、`left`、`sort`，MUST NOT 通过 IPC 传输 `content`。需要正文的读取路径（打开笔记、编辑器嵌入预览）不受此限制。

#### Scenario: 脑图首次加载

- **WHEN** 脑图挂载并读取节点列表
- **THEN** 查询与返回均不含 `content`

#### Scenario: 编辑器嵌入预览

- **WHEN** 笔记正文包含 `![[其他节点]]` 引用
- **THEN** 编辑器仍能读取被引用节点的正文并渲染预览

### Requirement: 打开笔记 MUST NOT 因反链阻塞正文

打开笔记时，系统 SHALL 在正文与节点列表就绪后立即显示内容；反链计算 SHALL 在其后异步执行。切换笔记时 MUST 先清空旧反链，且 MUST 丢弃切换前发起的反链结果。

#### Scenario: 正常打开

- **WHEN** 用户打开一篇笔记
- **THEN** 正文先显示，反链在计算完成后填入

#### Scenario: 快速切换

- **WHEN** 反链尚未返回时用户切换到另一篇笔记
- **THEN** 旧结果被丢弃，新笔记不会显示上一篇的反链

### Requirement: 编辑器 SHALL 按需加载

编辑器实现（TipTap 及其 katex/highlight 依赖）MUST NOT 进入应用启动包，SHALL 在首次进入笔记路由时按需加载；加载期间 SHALL 复用既有加载提示。脑图可用的环境下 SHALL 在空闲时预取编辑器模块。路由过渡（编辑器展开/收缩、Esc 返回）行为 MUST NOT 因按需加载而改变。

#### Scenario: 首次打开笔记

- **WHEN** 用户首次打开笔记
- **THEN** 编辑器模块按需加载，加载期间显示既有 loading，容器动画照常执行

#### Scenario: 预取命中

- **WHEN** 应用已在脑图停留片刻后打开笔记
- **THEN** 编辑器模块通常已预取，无需额外等待

#### Scenario: 退出与笔记间返回

- **WHEN** 用户按 Esc 退出或返回上一篇笔记
- **THEN** 收缩/即时导航行为与应用启动包静态引入时一致
