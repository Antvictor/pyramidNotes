# Pyramid Notes 打包指南

## 环境要求

- **Node.js**: v20.19+ (推荐 v20.20.2)
- **pnpm**: v10+
- **操作系统**: macOS (可交叉编译 Windows 包)

## 首次打包前准备

### 1. 安装依赖

```bash
nvm use 20
pnpm install
```

### 2. 下载 NSIS (Windows 安装包需要)

仅构建 Windows NSIS 安装包时需要。下载地址：

```
https://github.com/electron-userland/electron-builder-binaries/releases/download/nsis-3.0.4.1/nsis-3.0.4.1.7z
```

解压到：
```
~/Library/Caches/electron-builder/nsis-3.0.4.1/
```

解压命令：
```bash
curl -L -o /tmp/nsis.7z "https://github.com/electron-userland/electron-builder-binaries/releases/download/nsis-3.0.4.1/nsis-3.0.4.1.7z" && \
~/Library/Caches/electron-builder/7zip@1.0.0/7zip-darwin-x86_64-1r6y4/bin/7zz x /tmp/nsis.7z -o/Users/$USER/Library/Caches/electron-builder/nsis-3.0.4.1/ -y && \
rm /tmp/nsis.7z
```

> 如果不需要 Windows 安装包（仅需 zip），可跳过此步骤。

### 3. 编译原生模块 (仅开发环境需要)

如果 `npm run start` 启动报 NODE_MODULE_VERSION 错误：

```bash
cd node_modules/better-sqlite3 && \
npx node-gyp rebuild --target=28.3.3 --arch=x64 --dist-url=https://electronjs.org/headers
```

> 正式打包时 electron-builder 会自动重新编译，无需手动执行。

## 打包命令

所有命令在项目根目录下执行：

### 全部平台 (macOS + Windows)

```bash
nvm use 20
pnpm --filter web exec vite build    # 构建前端
cd electron && npx electron-builder --mac --win
```

### 仅 macOS

```bash
nvm use 20
pnpm --filter web exec vite build
cd electron && npx electron-builder --mac
```

### 仅 Windows

```bash
nvm use 20
pnpm --filter web exec vite build
cd electron && npx electron-builder --win
```

## 输出文件

打包完成后文件在 `release/` 目录：

| 文件 | 说明 |
|------|------|
| `Pyramid Notes-1.0.0.dmg` | macOS Intel 安装包 |
| `Pyramid Notes-1.0.0-arm64.dmg` | macOS M1/M2/M3 安装包 |
| `Pyramid Notes-1.0.0-mac.zip` | macOS Intel 便携版 |
| `Pyramid Notes-1.0.0-arm64-mac.zip` | macOS ARM 便携版 |
| `Pyramid Notes Setup 1.0.0.exe` | Windows 安装程序 |
| `Pyramid Notes-1.0.0-win.zip` | Windows 便携版 |

## 版本号

版本号在 `electron/package.json` 中修改：
```json
"version": "1.0.0"
```

## 缓存

electron-builder 下载的二进制文件缓存在 `~/Library/Caches/electron-builder/`。首次打包较慢，后续打包会复用缓存，速度更快。

## 故障排查

| 问题 | 解决 |
|------|------|
| NODE_MODULE_VERSION mismatch | 确认 web 和 electron 包都使用相同 Electron 版本 |
| NSIS 下载超时 | 手动下载解压到缓存目录 |
| vite build 报 @tailwindcss/typography 找不到 | `pnpm install` 重新安装依赖 |
