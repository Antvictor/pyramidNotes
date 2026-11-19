# Pyramid Notes 插件开发文档

> 插件 API `apiVersion: 1`
> 插件是本地 ES 模块：放进插件目录、启用后生效；改插件不需要重新发布应用。

---

## 1. 总览

插件给**笔记编辑器**加能力。它不是一个独立 App：没有页面路由、没有侧边栏、没有读写笔记文件的通道。

先看你想做什么：

| 你想做 | 现在可行吗 | 用到的接口 |
|---|---|---|
| 输入缩写自动变格式（`--` → `—`） | ✅ | `defineInputRule` |
| 在笔记里插入日期、标签、卡片这类新内容 | ✅ | `defineNode` + `addNodeView` |
| 给文字加一种新样式（高亮、特殊 Mark） | ✅ | `defineMark` |
| 给任务加截止日期/优先级 | ⚠️ 可做但复杂 | `advanced` 修改宿主扩展 |
| 独立的日历页面、侧边栏、设置页 | ❌ 当前不支持 | 需要下一版“笔记查询 + 面板挂载”API |

---

## 2. 快速开始：从零开发一个插件

目标：输入 `-- ` 自动变成破折号 `— `。

### 第 1 步：创建插件目录

插件目录位置：

- 用户插件（你自己开发）：`<storagePath>/plugins/<plugin-id>/`
- `storagePath` 是设置页「数据存储」的目录，macOS 默认 `~/Documents/pyramidNotes`
- 官方插件（随应用分发）：`<userData>/plugins/<plugin-id>/`

```bash
mkdir -p "$HOME/Documents/pyramidNotes/plugins/hello"
cd "$HOME/Documents/pyramidNotes/plugins/hello"
```

目录名 `hello` 就是插件 id，只能使用小写字母、数字与 `-`。

### 第 2 步：写 `manifest.json`

```json
{
  "id": "hello",
  "name": "Hello plugin",
  "description": "Typing -- inserts an em dash",
  "version": "1.0.0",
  "apiVersion": 1,
  "main": "main.mjs",
  "defaultEnabled": false,
  "permissions": ["editor"]
}
```

### 第 3 步：写 `main.mjs`

```js
export default function activate(ctx) {
  const { defineExtension, defineInputRule } = ctx.pyramid;

  const SmartDash = defineExtension({
    name: "helloSmartDash",
    addInputRules() {
      return [
        defineInputRule({
          find: /--$/,
          handler: ({ state, range }) => {
            state.tr.replaceWith(range.from, range.to, state.schema.text("—"));
          },
        }),
      ];
    },
  });

  ctx.editor.registerExtensions([SmartDash]);
}
```

这一段在做什么：

- `activate(ctx)`：插件入口，宿主加载模块后调用。
- `defineExtension`：定义一段编辑器行为。
- `addInputRules`：声明“什么时候触发”。
- `defineInputRule`：定义触发规则与处理函数。
- `ctx.editor.registerExtensions`：把扩展交给编辑器。

### 第 4 步：重启并启用

1. 重启 Pyramid Notes。
2. 打开「设置 → 插件」。
3. 找到 **Hello plugin**（来源：用户），点击「启用」。
4. 打开任意笔记，输入 `-- `，应变成 `— `。

### 第 5 步：修改与升级

直接改 `main.mjs`，重启应用即可；不需要重新打包应用。

### 常见问题

| 现象 | 原因 |
|---|---|
| 设置页看不到插件 | 目录名与 `id` 不一致、`manifest.json` 非法、`main` 文件名不对 |
| 显示「版本不兼容」 | `apiVersion` 不是 `1` |
| 显示「加载失败」 | `main.mjs` 有语法错误/抛错/没有 default export |
| 启用后没反应 | 检查权限是否包含 `editor`，以及是否调用了 `registerExtensions` |

---

## 3. 核心概念

| 概念 | 说明 | 对应接口 |
|---|---|---|
| 扩展（Extension） | 一段编辑器行为：输入规则、快捷键、底层插件 | `defineExtension` |
| 节点（Node） | 编辑器中一种新的内容，例如日期、卡片 | `defineNode` |
| Mark | 加在文字上的样式，例如高亮 | `defineMark` |
| NodeView | 节点在编辑器中的外观与交互 | 节点规格里的 `addNodeView` |
| InputRule | 输入触发的规则 | `defineInputRule` |
| 能力（Permission） | 你声明的权限决定 `ctx` 上有哪些能力 | manifest `permissions` |

---

## 4. Manifest 参考

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `id` | string | 是 | — | `^[a-z0-9-]+$`，必须等于目录名 |
| `name` | string | 否 | `id` | 显示名称（≤128） |
| `description` | string | 否 | 空 | 显示描述（≤512） |
| `nameKey` / `descriptionKey` | string | 否 | — | 官方插件 i18n key |
| `version` | string | 是 | — | 如 `1.0.0`；官方 seed 用它判断升级 |
| `apiVersion` | number | 是 | — | 必须为 `1` |
| `main` | string | 是 | — | 入口文件名，形如 `main.mjs` |
| `styles` | string[] | 否 | `[]` | CSS 文件列表；需声明 `styles` 权限 |
| `defaultEnabled` | boolean | 是 | — | 仅官方插件生效；用户插件一律默认关闭 |
| `permissions` | string[] | 否 | `["editor"]` | `editor` / `styles` / `advanced` |

权限规则：

- 省略 → `["editor"]`；显式空数组表示不申请任何能力。
- 未知权限名、超过 3 项 → manifest 非法，插件被跳过。
- `advanced` 必须同时声明 `editor`。
- 声明了 `styles` 文件却没有 `styles` 权限 → manifest 非法。

---

## 5. API 参考

### 5.1 `activate(ctx)`

**作用**：插件入口。宿主加载 `main.mjs` 后调用一次。

```js
export default function activate(ctx) {
  // 在这里注册扩展、注入样式
  return () => { /* 可选：清理函数（当前版本不会热卸载） */ };
}
```

- 必须是 `export default`。
- 可以返回一个函数作为清理钩子。
- 抛错 → 该插件标记为「加载失败」，其他插件不受影响。

### 5.2 `PluginContext` 字段一览

| 字段 | 类型 | 需要的权限 | 作用 |
|---|---|---|---|
| `apiVersion` | number | — | 宿主插件 API 版本（当前 `1`） |
| `manifest` | object | — | 已校验的 manifest（`permissions` 已归一化） |
| `log` | `{ info, warn, error }` | — | 输出以 `[plugin:<id>]` 开头的日志 |
| `editor` | `{ registerExtensions }` | `editor` | 把扩展交给编辑器 |
| `ui` | `{ injectStyle }` | `styles` | 注入 CSS |
| `pyramid` | object | — | 扩展工厂与宿主扩展 |

### 5.3 `ctx.pyramid.defineExtension(spec)`

**作用**：定义一段编辑器行为（输入规则、快捷键、底层插件等）。

**签名**：`defineExtension(spec): PyExtension`

**示例**：

```js
const MyExtension = ctx.pyramid.defineExtension({
  name: "myExtension",
  addInputRules() {
    return [/* ... */];
  },
});
```

返回的对象需要交给 `ctx.editor.registerExtensions([...])` 才会生效。

### 5.4 `ctx.pyramid.defineNode(spec)`

**作用**：定义一种新的节点（块级或行内），例如日期、标签、卡片。

**签名**：`defineNode(spec): PyExtension`

**示例**（最小行内节点）：

```js
const MyTag = ctx.pyramid.defineNode({
  name: "myTag",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return { label: { default: "" } };
  },

  parseHTML() {
    return [{ tag: "span[data-my-tag]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ["span", { ...HTMLAttributes, "data-my-tag": "" }, node.attrs.label];
  },
});
```

节点规格里常用的字段见 [5.7](#57-节点扩展规格常用字段)。

### 5.5 `ctx.pyramid.defineMark(spec)`

**作用**：定义一种加在文字上的样式（例如高亮、脚注标记）。

**签名**：`defineMark(spec): PyExtension`

**示例**：

```js
const Highlight = ctx.pyramid.defineMark({
  name: "myHighlight",
  parseHTML() {
    return [{ tag: "mark[data-my-highlight]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["mark", { ...HTMLAttributes, "data-my-highlight": "" }, 0];
  },
});
```

### 5.6 `ctx.pyramid.defineInputRule(config)`

**作用**：定义“输入什么文字时触发什么操作”，在扩展的 `addInputRules()` 里返回。

**签名**：`defineInputRule({ find, handler }): InputRule`

| 参数 | 说明 |
|---|---|
| `find` | 触发用的正则表达式 |
| `handler({ state, range, match })` | 命中后执行；`range` 是被替换的文本范围 |

**示例**：

```js
ctx.pyramid.defineInputRule({
  find: /-->$/,
  handler: ({ state, range }) => {
    state.tr.replaceWith(range.from, range.to, state.schema.text("→"));
  },
});
```

### 5.7 节点/扩展规格：常用字段

| 字段 | 作用 | 示例用途 |
|---|---|---|
| `addAttributes()` | 节点保存的数据 | 日期的 `date`、标签的 `label` |
| `parseHTML()` | 从 HTML 恢复节点 | 打开旧笔记时还原 |
| `renderHTML()` | 非编辑态如何显示 | 复制/导出时的 HTML |
| `addNodeView()` | 编辑器内的外观与交互 | 日期选择器、卡片按钮 |
| `addInputRules()` | 输入触发规则 | `@today `、`-- ` |
| `addProseMirrorPlugins()` | 底层文档插件 | 自动转换、装饰 |
| `addKeyboardShortcuts()` | 快捷键 | `Mod-Shift-.` |

`addNodeView` 示例（返回纯 DOM，不需要框架）：

```js
addNodeView() {
  return ({ node, editor, getPos }) => {
    const dom = document.createElement("span");
    dom.textContent = node.attrs.date || "选择日期";
    dom.addEventListener("click", () => {
      const value = window.prompt("日期（YYYY-MM-DD）", node.attrs.date || "");
      if (!value) return;
      const pos = typeof getPos === "function" ? getPos() : null;
      if (pos === null || pos === undefined) return;
      const { state, view } = editor.view;
      view.dispatch(state.tr.setNodeMarkup(pos, undefined, { date: value }));
    });
    return { dom };
  };
}
```

### 5.8 `ctx.pyramid.extensions`（需 `editor`）

**作用**：使用宿主自带的列表扩展，避免重复打包编辑器依赖。

| 成员 | 说明 |
|---|---|
| `TaskList` / `TaskItem` | 宿主提供的任务列表扩展 |
| `.extend(spec)` | 基于宿主扩展派生一个新扩展 |
| `.configure(options)` | 使用宿主扩展并修改选项 |

**示例**：

```js
const { TaskList, TaskItem } = ctx.pyramid.extensions;
ctx.editor.registerExtensions([
  TaskList,
  TaskItem.configure({ nested: true }),
]);
```

### 5.9 `ctx.pyramid.advanced`（需 `advanced`）

**作用**：需要直接操作编辑器底层（ProseMirror）时使用。

| 成员 | 作用 |
|---|---|
| `defineProseMirrorPlugin(config)` | 创建底层插件 |
| `Plugin` / `PluginKey` | 插件与键 |
| `TextSelection` | 文本选区工具 |
| `Fragment` | 文档片段 |
| `mergeAttributes` | 合并 HTML 属性 |

**示例**（简单文档扫描）：

```js
const MyPlugin = ctx.pyramid.advanced.defineProseMirrorPlugin({
  appendTransaction(transactions) {
    if (!transactions.some((tr) => tr.docChanged)) return null;
    // 扫描/转换逻辑；返回 null 表示不修改
    return null;
  },
});
```

### 5.10 `ctx.editor.registerExtensions(extensions)`（需 `editor`）

**作用**：把定义好的扩展交给编辑器。**不调用它，插件不会生效。**

```js
ctx.editor.registerExtensions([MyNode, MyExtension]);
```

- 可以多次调用。
- 这里的扩展会和其他插件的扩展合并。

### 5.11 `ctx.ui.injectStyle(css)`（需 `styles`）

**作用**：注入该插件的 CSS。同一插件重复调用会替换之前的内容。

```js
ctx.ui.injectStyle(`
  .my-tag {
    padding: 0 0.3em;
    border-radius: 4px;
    background: rgba(120, 160, 255, 0.2);
  }
`);
```

也可以改用 manifest 的 `styles` 文件（同样需要 `styles` 权限）。

### 5.12 `ctx.log`

**作用**：输出带插件前缀的日志，方便排查。

```js
ctx.log.info("activated");
ctx.log.warn("deprecated option");
ctx.log.error("failed", error);
```

控制台输出：`[plugin:hello] activated`。

---

## 6. 权限与安全

| 权限 | 注入的能力 |
|---|---|
| `editor` | `ctx.editor`、`ctx.pyramid.extensions` |
| `styles` | `ctx.ui`、manifest `styles` 文件注入 |
| `advanced` | `ctx.pyramid.advanced` |

- 未声明的能力在 `ctx` 上**直接不存在**（用 `ctx.ui?.injectStyle` 探测）。
- 权限是**契约级**限制，不是安全沙箱：插件与应用同 realm，仍可访问 `window.api` 与 DOM。只安装可信插件。
- 用户插件默认关闭；官方插件默认状态由 manifest 决定。

---

## 7. 样式

```css
/* styles.css，并在 manifest 的 styles 中声明 */
.my-tag { background: #eef; }
```

或：

```js
ctx.ui.injectStyle(".my-tag { background: #eef; }");
```

建议选择器加插件前缀。禁用插件后样式会在下一次加载时移除。

---

## 8. 错误与调试

| 现象 | 排查 |
|---|---|
| 插件不显示 | 目录名=id？manifest 合法？文件在 `<storagePath>/plugins` 下？ |
| 版本不兼容 | `apiVersion` 是否为 `1` |
| 加载失败 | `main.mjs` 语法/抛出异常/无 default export/调用了未声明权限的能力 |
| 插件生效但无效果 | 是否调用了 `ctx.editor.registerExtensions` |
| 样式没生效 | 是否声明 `styles` 权限；是否重启 |

日志：控制台 `[plugin:<id>]` 前缀；主进程 `plugins:list failed` / `plugins:read failed`。

---

## 9. 版本与兼容

- 宿主支持 `apiVersion: 1`；不兼容的插件会被跳过，不影响应用。
- 插件自身 `version` 用于官方 seed 升级比较。
- 未来不兼容变更会提升 `apiVersion` 并附迁移说明。

---

## 10. 实战案例：日期控件

完整代码：[`examples/calendar-date`](examples/calendar-date)（附自动化测试）。

核心思路：

1. `defineNode` 定义 `calendarDate`（行内、原子节点，属性 `date`）。
2. `addNodeView` 返回 `<span>`，点击时显示 `<input type="date">`，选择后通过 `tr.setNodeMarkup` 更新属性。
3. `defineInputRule` 监听 `@today `，插入当天日期。
4. manifest 声明 `["editor", "styles"]`。

```bash
cp -R docs/examples/calendar-date "$HOME/Documents/pyramidNotes/plugins/calendar-date"
# 重启 → 设置 → 插件 → 启用 → 输入 "@today "
```

局限：示例按 HTML 渲染保存；若要在 `.md` 中稳定往返，需要在节点中补 `addStorage().markdown` 序列化规则。独立日历页面需要下一版 API。

---

## 11. TypeScript 类型

作者视角类型见 [`plugin-api.d.ts`](plugin-api.d.ts)，覆盖 `PluginContext`、`PyramidApi`、`PluginManifest`、`ExtensionSpec` 等。

```ts
/// <reference path="./plugin-api.d.ts" />

export default function activate(ctx: PluginContext) {
  // ...
}
```
