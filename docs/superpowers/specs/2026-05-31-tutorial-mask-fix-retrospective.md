# 新手教程遮罩实现复盘

> **日期**: 2026-05-31
> **问题**: 用户在 user-action 阶段仍然可以与 MindMap 交互

---

## 问题现象

在教程的 user-action 阶段（等待用户操作的阶段），用户仍然可以：
- 右键点击 MindMap 打开右键菜单
- 与页面上的其他元素交互

遮罩层没有正确阻止用户与 MindMap 的交互。

---

## 根本原因

### 1. ReactFlow 使用 Portal 渲染

ReactFlow 的节点、右键菜单等组件通过 `React Portal` 渲染到 `document.body`，而不是在正常的 React 组件树中。

```jsx
// ReactFlow 内部类似这样渲染
const root = document.body;
ReactDOM.createPortal(nodeElement, root);
```

这导致 ReactFlow 的元素在 DOM 层级上处于 TutorialController 之外，普通的 z-index 层级无法正确覆盖。

### 2. Z-Index 冲突

| 组件 | Z-Index | 问题 |
|------|---------|------|
| ContextMenu | 9999 | 高于 tutorial-mask (9997) |
| Tutorial mask | 9997 | 低于 ContextMenu |
| BubbleTooltip | 9999 | 与 ContextMenu 同级 |

### 3. CSS pointer-events 冲突

- `pointer-events: all` → 遮罩阻止所有点击，但 BubbleTooltip 也被阻止
- `pointer-events: none` → 遮罩不阻止点击，但 MindMap 也能点击（错误）

---

## 解决方案

### 1. 提升 Z-Index 层级

```
tutorial-mask:    10000  (阻挡层)
bubble-tooltip:   10001  (在遮罩之上)
selection-ring:  9999   (可穿透)
```

### 2. 确保 BubbleTooltip 可点击

```css
/* tutorial.css */
.tutorial-mask {
  pointer-events: all; /* 阻止所有点击穿透到下面 */
}

.bubble-tooltip {
  pointer-events: all !important; /* 强制可点击 */
  z-index: 10001 !important;
}

.bubble-tooltip button {
  pointer-events: all !important;
}
```

### 3. 组件内联样式 + CSS 优先级

BubbleTooltip 组件内部也需要设置 `pointerEvents: 'all'` 和 `zIndex: 10001`，防止被 CSS 覆盖。

---

## 关键技术点

### Portal 渲染的影响

当第三方库（ReactFlow、Radix UI Dialog 等）使用 Portal 渲染时，它们的元素在 DOM 树中是"浮在顶层"的，普通的子元素 z-index 无法正确控制层叠顺序。

**解决方案**：使用足够高的 z-index（10000+）确保遮罩层位于所有 Portal 元素之上。

### CSS 特异性冲突

TailwindCSS 和组件内联样式可能会覆盖我们定义的 CSS 类。需要使用 `!important` 或在组件内部使用 `style` 属性设置关键样式。

### 事件穿透逻辑

```
pointer-events: all  → 元素接收点击事件（阻止穿透）
pointer-events: none → 元素不接收点击事件（允许穿透）
```

遮罩层需要 `pointer-events: all` 阻止用户点击 MindMap，但 BubbleTooltip 需要单独设置 `pointer-events: all` 让自己可点击。

---

## 修改的文件

| 文件 | 修改内容 |
|------|----------|
| `tutorial.css` | 添加 `.tutorial-mask` 和 `.bubble-tooltip` 样式，使用高 z-index 和 `!important` |
| `BubbleTooltip.jsx` | 内联设置 `zIndex: 10001` 和 `pointerEvents: 'all'` |
| `TutorialController.jsx` | 控制遮罩层的渲染时机（user-action 阶段） |

---

## 验证方法

刷新页面后：
1. 应该看到**红色半透明遮罩**覆盖整个页面
2. 点击"跳过"或"下一步"按钮应该有效
3. 右键点击 MindMap 应该**无效**（被遮罩阻止）

---

## 后续优化建议

1. **移除调试红色**：开发完成后将 `background: rgba(255,0,0,0.3)` 改为 `background: transparent`
2. **ContextMenu 屏蔽**：当前设计无法阻止 ContextMenu 弹出，需要考虑在 TutorialController 中拦截 `contextmenu` 事件
3. **多页面支持**：当教程步骤需要切换页面时（如 Step 9 导航到 Settings），需要正确处理跨页面的遮罩逻辑