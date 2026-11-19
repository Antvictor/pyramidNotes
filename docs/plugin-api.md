# Pyramid Notes 插件开发指南

> 适用版本：插件 API `apiVersion: 1`
> 插件可扩展编辑器能力（TipTap 扩展），无需重新打包 App，替换文件后重启即可生效。

## 1. 插件放在哪

| 来源 | 目录 | 默认启用 |
|---|---|---|
| 官方插件 | `<userData>/plugins/` | 遵循 manifest 的 `defaultEnabled` |
| 用户插件 | `<storagePath>/plugins/` | **始终默认关闭**，需在设置页手动开启 |

- `storagePath` 是设置页「数据存储」配置的目录，默认 `~/Documents/pyramidNotes`。
- 两个目录中 id 相同时，**官方插件优先**，用户目录的同名插件被忽略。

macOS 示例：

```
~/Library/Application Support/pyramid-notes/plugins/tasks/     # 官方
~/Documents/pyramidNotes/plugins/hello/                        # 用户
```

## 2. 插件目录结构

```
<plugin-id>/
├── manifest.json
├── main.mjs
└── styles.css        # 可选
```

`<plugin-id>` 只能包含小写字母、数字和 `-`，且必须与 manifest 的 `id` 一致。

## 3. manifest.json

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 是 | `^[a-z0-9-]+$`，与目录名一致 |
| `name` | string | 否 | 显示名称（用户插件用这个） |
| `description` | string | 否 | 显示描述 |
| `nameKey` / `descriptionKey` | string | 否 | 官方插件可用的 i18n key，优先于 `name`/`description` |
| `version` | string | 是 | 数字点分版本，如 `1.0.0` |
| `apiVersion` | number | 是 | 必须等于宿主支持版本；当前为 `1`，不匹配会标记为不兼容且不加载 |
| `main` | string | 是 | 入口文件名，必须形如 `main.mjs` |
| `styles` | string[] | 否 | CSS 文件名列表，必须形如 `styles.css`，由宿主注入 |
| `defaultEnabled` | boolean | 是 | 官方插件的默认启用状态；用户插件忽略此项 |

示例：

```json
{
  "id": "hello",
  "name": "Hello plugin",
  "description": "Typing -- inserts an em dash",
  "version": "1.0.0",
  "apiVersion": 1,
  "main": "main.mjs",
  "defaultEnabled": false
}
```

## 4. main.mjs 与 activate(ctx)

插件必须是**单文件 ES 模块**，并且：

- **禁止使用任何 `import`**（包括相对路径和包名）。运行时以 Blob URL 动态加载，无法解析依赖。
- 只能 `export default` 一个 `activate` 函数。
- 所有 TipTap 构造器与能力由宿主通过 `ctx` 注入。

```js
export default function activate(ctx) {
  const { Extension, InputRule } = ctx.tiptap;

  const Hello = Extension.create({
    name: "helloPlugin",
    addInputRules() {
      return [
        new InputRule({
          find: /--$/,
          handler: ({ state, range }) => {
            state.tr.replaceWith(range.from, range.to, state.schema.text("—"));
          },
        }),
      ];
    },
  });

  ctx.editor.registerExtensions([Hello]);
}
```

`activate` 的返回值可选：若返回函数，会被视作清理钩子（当前版本不会热卸载，仅保留约定）。

### PluginContext

| 字段 | 说明 |
|---|---|
| `id` | 插件 id |
| `apiVersion` | 宿主插件 API 版本（当前 `1`） |
| `manifest` | 宿主已校验的 manifest |
| `tiptap.Extension` / `Node` / `Mark` | TipTap 节点的构造器 |
| `tiptap.InputRule` / `mergeAttributes` | 输入规则与属性合并工具 |
| `tiptap.Plugin` / `PluginKey` / `TextSelection` | ProseMirror state 工具 |
| `tiptap.Fragment` | ProseMirror 模型工具 |
| `tiptap.extensions.TaskList` / `TaskItem` | 宿主自带的列表扩展（注册了 tasks 插件时才可用） |
| `editor.registerExtensions(extensions)` | 把扩展交给宿主编辑器 |
| `ui.injectStyle(css)` | 注入一段内联 CSS（同 id 会替换） |

> **为什么必须用 `ctx.tiptap`**：如果插件自己打包一份 `@tiptap/core` / `@tiptap/pm`，会与宿主产生两套 ProseMirror 实例，schema 不兼容并可能导致编辑器崩溃。不要 `import`，也不要把 TipTap 打进插件。

## 5. 样式

两种方式任选：

1. manifest 的 `styles` 声明 CSS 文件，宿主读取后注入 `<style data-plugin-id="<id>">`；
2. 在 `activate` 内调用 `ctx.ui.injectStyle(".selector { ... }")`。

样式选择器建议加插件前缀，避免影响其他内容。

## 6. 启用与生效

- 用户插件放入目录后，打开「设置 → 插件」即可看到（来源标记为「用户」），默认关闭，点击「启用」后生效。
- 修改插件文件后**重启应用**（当前版本不监听文件变化）。
- 官方插件由安装包 seed 同步：文件缺失会自动补齐；seed 版本更高时会覆盖官方目录。官方插件请在 `userData/plugins` 下修改，或提升 seed 版本。

## 7. 调试与错误处理

- 单个插件加载失败（manifest 非法、`main.mjs` 抛错、`apiVersion` 不匹配）不会影响应用和其他插件；设置页会显示「加载失败」或「版本不兼容」。
- 主进程日志会打印 `plugins:list failed` / `plugins:read failed`。
- 常见原因：
  - manifest 的 `id` 与目录名不一致；
  - `main.mjs` 里写了 `import`；
  - `activate` 抛错或没有 default export；
  - 文件超过大小限制（入口 1 MB，单个样式 512 KB）。

## 8. 安全提示

插件与应用运行在同一个渲染进程中，**可以访问页面与 `window.api`（包括笔记读写能力）**。请只安装你信任的插件。用户插件默认关闭正是为了阻止笔记目录同步带来的陌生代码自动执行。

## 9. 示例

完整可运行示例见 [`examples/hello-plugin`](examples/hello-plugin)：

```bash
# 复制到用户插件目录（macOS 默认存储路径）
cp -R docs/examples/hello-plugin "$HOME/Documents/pyramidNotes/plugins/hello"
# 重启应用，在 设置 → 插件 中启用 Hello plugin
# 在编辑器中输入 "-- " 会变成 "— "
```

## 10. 版本兼容

宿主当前支持的插件 API 版本为 `1`（`PLUGIN_API_VERSION`）。未来 API 变更时会提高版本号；不兼容的插件会被安全跳过，不影响应用启动。
