# Pyramid Notes 打包指南

## 发布流程

```bash
# 1. 确保 electron/package.json 版本号已更新

# 2. 打 annotated prerelease tag，-m 后面写更新内容
git tag -a v1.0.0-alpha -m "新功能：移动节点
修复：节点名包含 / 导致报错"

# 3. 推送 tag
git push origin v1.0.0-alpha
```

推送 tag 后 GitHub Actions 自动执行：macOS 构建 -> Windows 构建 -> 校验 Release 资产 -> 生成 `release-metadata.json` -> 创建 GitHub Release。

## 本地开发

```bash
nvm use 22
pnpm install
pnpm run start
```

## 本地构建（仅 macOS）

如需本地打 macOS 包测试：

```bash
nvm use 22
pnpm --filter web exec vite build
cd electron && npx electron-builder --mac
```

> Windows 包请通过 GitHub Actions 构建。`better-sqlite3` 是原生模块，无法从 macOS 交叉编译到 Windows。

## 输出文件

| 文件 | 说明 |
|------|------|
| `Pyramid Notes-1.0.0-alpha.dmg` | macOS Intel 安装包 |
| `Pyramid Notes-1.0.0-alpha-arm64.dmg` | macOS Apple Silicon 安装包 |
| `Pyramid Notes-1.0.0-alpha-mac.zip` | macOS Intel 便携版 |
| `Pyramid Notes-1.0.0-alpha-arm64-mac.zip` | macOS ARM 便携版 |
| `Pyramid Notes Setup 1.0.0-alpha.exe` | Windows 安装程序，当前同时覆盖 x64 与 ia32 |
| `Pyramid Notes-1.0.0-alpha-win.zip` | Windows 便携版 (x64) |
| `Pyramid Notes-1.0.0-alpha-ia32-win.zip` | Windows 便携版 (ia32) |

## 下载契约

- macOS x64 默认下载：`Pyramid Notes-1.0.0-alpha.dmg`
- macOS arm64 默认下载：`Pyramid Notes-1.0.0-alpha-arm64.dmg`
- Windows x64 默认下载：`Pyramid Notes Setup 1.0.0-alpha.exe`
- Windows ia32 默认下载：`Pyramid Notes Setup 1.0.0-alpha.exe`
- `zip` 文件继续发布，但作为便携版二级资产，不是默认推荐下载

GitHub Release 发布前会校验：

- 四个支持目标都能映射到主下载资产
- 文件名符合约定，不存在歧义
- 会生成 `release/release-metadata.json` 供后续下载站点消费

## 版本号

修改 `electron/package.json` 中的 `version` 字段。当前阶段优先使用 prerelease 版本，例如 `1.0.0-alpha`，tag 需与此一致（去掉 `v` 前缀）。

## 故障排查

| 问题 | 解决 |
|------|------|
| NODE_MODULE_VERSION mismatch | `nvm use 22 && pnpm install` |
| vite build 报依赖找不到 | `pnpm install` |
| Windows 包 `not a valid Win32 application` | 必须通过 GitHub Actions 构建，不能从 macOS 交叉编译 |
