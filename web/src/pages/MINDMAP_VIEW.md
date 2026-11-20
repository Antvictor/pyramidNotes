# 脑图视图机制说明

> 维护提示：修改脑图**节点可见性、展开/折叠、布局或视口**相关代码前**必读本文档**。
> 可见性与展开状态曾长期不同步，表现为「节点存在但不显示，必须折叠再展开」；布局曾有两次不同源的排版，
> 表现为「先缩一下再回来」。两处都**不报错**，只错行为，原因见"为什么容易改坏"。

## 两个状态 + 一条不变量

| 状态 | 位置 | 作用 |
|---|---|---|
| `loadedNodeIds` | `mindMapViewStore` | **可见性硬过滤**：`displayedNotes = pool.filter(n => loadedNodeIds.has(n.id))` |
| `expandedNodeIds` | `mindMapViewStore` | 节点是否展开（决定显示"折叠"还是"展开"按钮） |

**不变量：已展开（`expandedNodeIds`）⇒ 其直接子节点必已加载（`loadedNodeIds`）。**

由 `MindMap.jsx` 的一个协调 effect 自动维护：`collectExpandedChildren(expandedNodeIds, allNotesNodeMap)`
→ 并入 `loadedNodeIds`。数据变化或展开操作后自动补齐；无变化返回原引用（React bail out）；
依赖不含 `loadedNodeIds`（避免自循环）。

> ⚠️ 该 effect **必须放在 `allNotesNodeMap` 定义之后** —— 依赖数组在**渲染时**求值，放前面会因 `const` TDZ 抛错。

## 布局链（两次布局，结果必须一致）

| 阶段 | 位置 | 尺寸来源 | 时机 |
|---|---|---|---|
| 主布局 | `MindMap.jsx` 的大 effect | `measuredSizesCache`（上轮实测）；缺失时按节点名**估算**（`layoutTree` 的 `getNodeSize`） | `displayedNotes` 变化时立即 |
| 实测布局 | `LayoutOnMeasured` 子组件 | ReactFlow 该轮**实测**尺寸 | 逐帧轮询，测量就绪后**下一帧**应用 |

两次结果必须一致，否则会看到"先缩一下再回来"的二次重排。实测布局会把尺寸写回 `measuredSizesCache` 供主布局复用。

## 节点位置过渡

`web/src/index.css`：

```css
.react-flow__node { transition: transform 180ms ease-out; }
.react-flow__node.dragging { transition: none; }   /* 拖拽时必须禁用，否则节点跟不上光标 */
```

## 视口与居中

| 机制 | 说明 |
|---|---|
| `centerWhenRendered()` | 逐帧等节点**真正进入** ReactFlow 后 `setCenter`，替代固定 `setTimeout`；创建/移动/聚焦后调用 |
| `viewportCache` | `onMoveEnd` 记录 `{x,y,zoom}`；挂载时经 `defaultViewport` 恢复，并 `fitView={!viewportCache}` |
| 返回时相机 | 从编辑器返回时：节点已完整可见（`margin=8`）→ **完全不动**；离屏 → 在脑图可见前 `duration:0` 居中（保持缩放）。脑图 `visibility:hidden` 直到定位完成，随后直接显示 |
| 非编辑器来源 | 首次启动/设置/回收站返回：恢复 `viewportCache` 或 `fitView`，不强制居中 |
| 聚焦切换 | 聚焦会把树以该节点为**重根**重排到布局原点 (50,50) → **必须** `centerWhenRendered()`，否则节点移出屏幕 |

## 路由过渡（脑图 ↔ 编辑器）

- 打开（双击 / Ctrl+Enter）：脑图淡出 `MAP_EXIT_MS` → 导航 → 编辑器容器挂载即展开 `EDITOR_ENTER_MS`（loading 也在容器内）。
- 退出（Esc）：编辑器收缩 `EDITOR_EXIT_MS` → 导航 → 脑图在定位完成后直接显示。
- 只有 `transform/opacity` 参与动画；**脑图段不做缩放**，避免缩放中的 transform 进入 ReactFlow 的容器测量。
- 返回定位由 `MapEntryCenter` 在 `visibility:hidden` 期间完成（见上表）；`resolveEntryCamera()` 是纯函数，规则为 `restore | none | center`。
- 淡出期间 `leavingRef` 冻结节点/空白点击与快捷键，防止选中被清空。
- 动画时长常量在 `web/src/lib/routeTransition.js`，CSS 注释标注对应关系；`prefers-reduced-motion` 下直接导航。

## 跨卸载缓存（返回脑图不重载）

MindMap 在切到 `/note/...` 时会**卸载**。`MindMap.jsx` 顶部的模块级缓存让返回时首帧即恢复：

| 缓存 | 作用 |
|---|---|
| `notesDataCache` | 首帧立即渲染，避免空白闪屏 |
| `measuredSizesCache` | 首帧即用实测尺寸，避免"估算 → 实测"的 settle |
| `viewportCache` | 恢复离开时的视口 |

挂载时**先用缓存渲染，同时后台 `db.notes.select()` 刷新**，用 `sameGraph`（只比 `id` / `top` / `left` / `name`）
决定是否真的更新 —— **只改正文（`content` / `last_up_time` 变化）不应触发重排**。

## 为什么容易改坏

1. **可见性与展开是两个独立状态**：任何"新建 / 删除 / 揭示节点"的流程若忘了同步 `loadedNodeIds`，
   节点就"存在但不显示"，**不报错**。新增流程应依赖不变量（把祖先标进 `expandedNodeIds`），而不是手工 add。
2. **两次布局必须同源**：尺寸来源不一致就会二次重排。
3. **订阅式状态 vs 模块级缓存**：`loadedNodeIds` 等在 store（组件订阅、跨卸载保留）；
   `notesDataCache` 等在模块作用域（只在挂载时读一次）。放错地方会导致多余渲染或状态丢失。
4. **纯视觉行为无测试覆盖**：`vite build` 通过 ≠ 交互正确。可见性不变量有单测（`treeUtils.test.js`），
   布局与视口**没有**。

## 禁忌

1. **不要在 `allNotesNodeMap` 之前声明依赖它的 effect**（依赖数组 TDZ）。
2. **不要去掉 `.react-flow__node.dragging` 的 `transition: none`**。
3. **不要用固定 `setTimeout` 等渲染**：用 `centerWhenRendered()` / 逐帧轮询。
4. **不要手工往 `loadedNodeIds` 塞节点来"显示"它**：应把它的祖先加入 `expandedNodeIds`，让不变量补齐
   （手工塞会重新引入不同步）。
5. **不要在 `sameGraph` 里比较 `content` / `last_up_time`**：编辑正文会导致返回脑图时无谓重排。

## 常见修改速查

| 需求 | 改动点 |
|---|---|
| 改可见性规则 | `web/src/pages/treeUtils.js` 的纯函数（有单测）+ `MindMap.jsx` 的不变量 effect |
| 改展开/折叠行为 | `MindMap.jsx` 的 `expandOneLevel` / `expandAll` / `collapseNode`（记得同步 `expandedNodeIds`） |
| 改布局算法 | `layoutTree()`（`MindMap.jsx` 顶部纯函数） |
| 改过渡时长 | 节点位置：`web/src/index.css` 的 `.react-flow__node` transition；路由切换：`web/src/lib/routeTransition.js` + `index.css` 的 `route-anim-*` |
| 改"返回脑图"行为 | `MindMap.jsx` 顶部三个模块级缓存 + `MapEntryCenter` + `ReactFlow` 的 `defaultViewport` / `fitView` |
| 改聚焦行为 | 聚焦/全局按钮的 `setFocusNodeId(...)` + 必须配 `centerWhenRendered()` |

## 修复历史

- **2026-11-20**：脑图 ↔ 编辑器加入展开/收缩过渡。打开时脑图淡出、编辑器展开；Esc 退出时编辑器收缩、脑图在定位完成后直接显示。
  返回相机改为「节点可见则不动，离屏则在脑图隐藏时零时长居中」，移除旧的 `100ms + 700ms 平移` 挂载 effect，
  消除"退出后镜头再动"的割裂感。新增 `lib/routeTransition.js`、`MapEntryCenter`、`prefers-reduced-motion` 降级。

- **2026-09-16**：建立不变量「已展开 ⇒ 子节点已加载」；`createChildFromSelection` 补揭示父链；
  聚焦 / 回到全局补 `centerWhenRendered()`。
  此前 `revealNodeIds` 只加载祖先链（不含兄弟），编辑器"提取节点"路径**完全没有**揭示，导致节点"存在但不显示"。
- **2026-09-15 ~ 16**：布局与视口性能系列修复 —— 统一两次布局的尺寸来源、实测布局改为逐帧应用（去掉固定 200ms）、
  节点位置过渡动画、返回脑图的模块级缓存（数据 / 尺寸 / 视口）。
