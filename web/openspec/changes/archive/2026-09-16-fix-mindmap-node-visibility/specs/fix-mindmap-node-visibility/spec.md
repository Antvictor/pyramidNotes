# fix-mindmap-node-visibility Specification

## Purpose

修复脑图节点可见性与展开状态不同步、导致节点"存在但不显示"的问题，
并让聚焦模式切换后视口跟随重排，避免节点移出可视区域。

## Requirements

### Requirement: 展开与可见一致

凡是处于展开（`expandedNodeIds`）状态的节点，其直接子节点 SHALL 都已加载（存在于 `loadedNodeIds`）。
系统 SHALL 在数据变化（新增/删除节点）或展开操作后自动满足该不变量。

### Requirement: 新建节点立即可见

在编辑页创建子节点后返回脑图，新节点 SHALL 立即可见，其父链 SHALL 被展开，
用户 SHALL NOT 需要手动折叠再展开才能看到该节点。

### Requirement: 搜索揭示包含兄弟

搜索并打开一个节点后，其父节点 SHALL 处于展开状态，且该父节点的所有子节点（含兄弟节点）SHALL 显示。

### Requirement: 聚焦切换视口跟随

进入或退出聚焦模式导致树重新布局（重根到布局原点）后，
视口 SHALL 跟随到当前选中节点，被聚焦的节点 SHALL NOT 移出可视区域。
