# Pyramid Notes 打包指南

## 发布流程

```bash
# 1. 确保 electron/package.json 版本号已更新

# 2. 打 annotated tag，-m 后面写更新内容
git tag -a v1.0.0 -m "新功能：移动节点
修复：节点名包含 / 导致报错"

# 3. 推送 tag
git push origin v1.0.0
```

推送后 GitHub Actions 自动：macOS 构建 → Windows 构建 → 创建 Release（含你的更新说明 + 自动生成的 commit 列表）。

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
| `Pyramid Notes-1.0.0.dmg` | macOS Intel 安装包 |
| `Pyramid Notes-1.0.0-arm64.dmg` | macOS Apple Silicon 安装包 |
| `Pyramid Notes-1.0.0-mac.zip` | macOS Intel 便携版 |
| `Pyramid Notes-1.0.0-arm64-mac.zip` | macOS ARM 便携版 |
| `Pyramid Notes Setup 1.0.0.exe` | Windows 安装程序 (x64 + x32) |
| `Pyramid Notes-1.0.0-win.zip` | Windows x64 便携版 |
| `Pyramid Notes-1.0.0-ia32-win.zip` | Windows x32 便携版 |

## 版本号

修改 `electron/package.json` 中的 `version` 字段，tag 需与此一致（去掉 `v` 前缀）。

## 故障排查

| 问题 | 解决 |
|------|------|
| NODE_MODULE_VERSION mismatch | `nvm use 22 && pnpm install` |
| vite build 报依赖找不到 | `pnpm install` |
| Windows 包 `not a valid Win32 application` | 必须通过 GitHub Actions 构建，不能从 macOS 交叉编译 |
