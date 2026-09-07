# 编辑器宽度布局指南

> 维护提示：修改笔记编辑器宽度/居中/滚动相关代码前，**必读本文档**。此区域曾多次改坏（2026-09-07 修复记录见文末），原因见"为什么容易改坏"。

## 布局链（自外向内）

编辑器宽度由 7 层嵌套元素共同决定，每层贡献一个约束：

| 层 | 位置 | 职责 | 关键样式 |
|----|------|------|----------|
| 1. `body` | `web/src/index.css` | 普通块级文档流 | ⚠️ **禁止加 `display: flex`**（见禁忌 2） |
| 2. `#root` | React 挂载点 | 无宽度样式，块级自然全宽 | — |
| 3. App 根 div | `web/src/App.jsx` ~100 行 | 横向 flex 容器 | `height: 100vh`，无宽度声明 |
| 4. Sidebar | `web/src/App.jsx` ~102 行 | 固定窄条 | 60px |
| 5. 内容区 div | `web/src/App.jsx` ~105 行 | 路由出口容器 | `flex: 1` + `padding: 20px` + `overflow: hidden` |
| 6. Node wrapper | `web/src/pages/note/Node.jsx` ~182 行 | 编辑器定位层 | `flex` + `justify-content: center` + `100%×100%` |
| 7. 编辑器根 div | `web/src/core/editor/TipTapEditor.tsx`（return 的最外层 div） | **滚动容器** | `width: 100%`、`height: 100%`、`overflowY: auto`、`position: relative`；按模式挂 className |
| 8. EditorContent 包裹 | tiptap 自动生成 | 无样式透明层 | — |
| 9. `.ProseMirror` | 规则在 `web/src/pages/note/markdown.css` 末尾 | **内容列** | 限制模式：`max-width: 794px` + `margin: auto` |

## 职责划分（改前先对照）

| 想控制什么 | 归属 |
|-----------|------|
| 滚动条位置（必须贴窗口右缘） | 第 7 层编辑器根 div —— 必须永远全宽 |
| 内容列宽度 / 居中 | 第 9 层 `.editor-width-constrained .ProseMirror`（markdown.css） |
| 模式切换（限制/放开） | `editorWidthMode` prop → 根 div 的 className，纯 CSS 生效 |
| 设置存储链路 | `electron/common/settings.cjs` → `web/src/types/global.d.ts` → `web/src/pages/settings/Settings.jsx` → `Node.jsx` 监听 `settings-changed` |
| 编辑器与窗口边缘的留白 | 第 5 层 App 内容区的 `padding: 20px` |

## 为什么容易改坏

1. **宽度是链条式决定的**：任何一层改动都会传导到所有内层，孤立地看单层代码看不出问题。
2. **`width: 100%` 是信任式声明**：依赖父级有"确定宽度"。一旦某层变成内容定宽（如 body 上有 flex），下面所有 `100%` **静默塌缩**为内容宽——不报错，只错样式。
3. **滚动容器 ≠ 内容列**：`max-width` 放错层（比如放在第 7 层），滚动条就从窗口右缘跑到窗口中间。
4. **纯视觉布局无测试覆盖**：`vite build` 通过 ≠ 布局正确。

## 禁忌（每次踩坑记录）

1. **不要给编辑器根 div（第 7 层）加 `maxWidth`** —— 它是滚动容器，加上后滚动条贴容器右缘 = 窗口中间。宽度限制只能放在 `.ProseMirror`（第 9 层）。
2. **不要恢复 `body { display: flex; place-items: center; }`** —— 这是 Vite 脚手架残留（2026-09-07 已删除）。它使 `#root` 变成收缩包裹的 flex item，整个应用的 `width: 100%` 全部塌缩为内容宽，表现为"编辑器贴左、限制/放开两种模式看起来一样"。历史上被笔记页写死的 `90vw` 掩盖。
3. **不要用 `editorProps.attributes.style` 动态注入宽度** —— editorProps 在 ProseMirror view 创建时捕获，设置切换后不会更新。模式切换只能走 className + CSS。
4. **后代选择器会波及嵌套编辑器**：`.editor-width-constrained .ProseMirror` 也会命中嵌入节点（`@[[]]`）内的嵌套编辑器。目前无害（它们位于 794px 列内部，父容器更窄，规则是 no-op），但改选择器或给嵌入节点加宽度样式时要注意叠加效果。

## 常见修改速查

| 需求 | 改动点 |
|------|--------|
| 调整 A4 宽度（794px） | `markdown.css` 末尾规则的 `max-width`（同步更新注释中的换算说明） |
| 修改默认模式 | `electron/common/settings.cjs` 的 `DEFAULT_SETTINGS.editorWidthMode` + `TipTapEditor.tsx` 的 prop 默认值 |
| 新增第三种模式 | `global.d.ts` 联合类型 → `Settings.jsx` 按钮 → `TipTapEditor.tsx` className 分支 → `markdown.css` 新规则 |
| 调整内容区与窗口的留白 | `App.jsx` 内容区 div 的 `padding` |

## 调试探针

布局可疑时，在应用 DevTools Console 运行（开发模式自动打开 DevTools），直接看每一层的宽度、display 与内联样式，快速定位是哪一层塌了：

```js
(() => {
  const pms = document.querySelectorAll('.ProseMirror');
  const chain = [];
  let el = pms[0];
  while (el && el !== document.body) {
    const cs = getComputedStyle(el);
    chain.push({
      cls: (el.className || '').toString().slice(0, 50),
      w: el.offsetWidth,
      display: cs.display,
      width: cs.width,
      maxW: cs.maxWidth,
      inline: (el.getAttribute('style') || '').slice(0, 100)
    });
    el = el.parentElement;
  }
  return JSON.stringify({ pmCount: pms.length, chain }, null, 1);
})()
```

判读方法：从最外层往内，第一处 `width` 不等于其父级内容宽的地方就是塌缩点。若最外层（`#root`）就小于 `window.innerWidth`，问题在全局 CSS（body/#root），与编辑器无关。

## 修复历史

- **2026-09-07**：实现限制/放开两种宽度模式。第一次实现把 `maxWidth: 800` 放在滚动容器上导致滚动条在窗口中间；改为 className + `.ProseMirror` CSS 后仍异常，最终定位到 `body { display: flex }`（Vite 残留）导致全应用宽度塌缩。删除后修复。涉及：`TipTapEditor.tsx`、`markdown.css`、`index.css`。
