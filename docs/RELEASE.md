# Pyramid Notes 发布指南

## 前置条件

- 安装 [GitHub CLI](https://cli.github.com/)：`brew install gh`
- 已登录：`gh auth login`
- 项目已推送至 `github.com/Antvictor/pyramidNotes`

## 发布步骤

### 1. 更新版本号

修改 `electron/package.json` 中的 `version` 字段：

```json
"version": "1.0.0-alpha"
```

### 2. 打包

参考 [BUILD.md](BUILD.md) 完成各平台打包。发布 workflow 期望看到以下资产映射：

- `macOS x64` -> `Pyramid Notes-<version>.dmg`
- `macOS arm64` -> `Pyramid Notes-<version>-arm64.dmg`
- `Windows x64` -> `Pyramid Notes Setup <version>.exe`
- `Windows ia32` -> `Pyramid Notes Setup <version>.exe`

额外便携包：

- `Pyramid Notes-<version>-mac.zip`
- `Pyramid Notes-<version>-arm64-mac.zip`
- `Pyramid Notes-<version>-win.zip`
- `Pyramid Notes-<version>-ia32-win.zip`

### 3. 合并到 main 并打 tag

```bash
git checkout main
git merge <你的开发分支>
git push origin main
git tag -a v1.0.0-alpha -m "更新说明"
git push origin v1.0.0-alpha
```

### 4. 由 workflow 自动创建 GitHub Release

推送 tag 后，`.github/workflows/release.yml` 会自动：

- 下载 macOS / Windows 构建产物
- 校验四个支持目标的下载映射
- 生成 `release/release-metadata.json`
- 只上传校验通过的资产与 metadata
- 创建或重建同名 GitHub Release

上传完成后可在 `https://github.com/Antvictor/pyramidNotes/releases` 查看。

### 5. Prerelease 规则

当前阶段默认继续发布 prerelease，不使用 stable tag。

- `v1.0.0-alpha` -> prerelease
- `v1.0.0-alpha.1` -> prerelease
- `v1.0.0-beta.2` -> prerelease
- `v1.0.0-rc.1` -> prerelease

只有在准备正式公开时才使用不带后缀的 stable tag，例如 `v1.0.0`。

workflow 和 `release-metadata.json` 都按同一规则设置 `prerelease`。

### 6. 发布说明模板

### v1.0.0-alpha.7

**更新内容**

- 新增图片引用：复制图片后粘贴自动保存到附件目录，通过 `![[图片名.png]]` 引用显示；复制图片网络地址后通过 `![](url)` 引用显示
- 新增节点引用：`[[节点名称]]` 创建内联链接，点击可跳转；`![[节点名称]]` 嵌入节点完整内容，双击可跳转
- 新增系统字体大小配置：设置 → 系统设置中可调整系统 UI 字体大小（px）
- 新增笔记字体大小配置：设置 → 系统设置中可调整笔记正文大小，标题按比例同步缩放（h1: 2×, h2: 1.75×, h3: 1.5×, h4: 1.25×, h5: 1.125×, h6: 1×）
- 优化使用说明：新增节点引用和图片引用功能说明
- 优化侧边栏：移除无用的关于页

**安装包**

| 平台 | 文件 | 说明 |
|------|------|------|
| macOS Intel | Pyramid Notes-1.0.0-alpha.7.dmg | 拖拽安装 |
| macOS Intel | Pyramid Notes-1.0.0-alpha.7-mac.zip | 解压即用 |
| macOS Apple Silicon | Pyramid Notes-1.0.0-alpha.7-arm64.dmg | 拖拽安装 |
| macOS Apple Silicon | Pyramid Notes-1.0.0-alpha.7-arm64-mac.zip | 解压即用 |
| Windows x64 | Pyramid Notes Setup 1.0.0-alpha.7.exe | 默认安装程序 |
| Windows ia32 | Pyramid Notes Setup 1.0.0-alpha.7.exe | 默认安装程序 |
| Windows x64 | Pyramid Notes-1.0.0-alpha.7-win.zip | 解压即用 |
| Windows ia32 | Pyramid Notes-1.0.0-alpha.7-ia32-win.zip | 解压即用 |

### 模板

```markdown
**更新内容**

- 新增 xxx
- 修复 xxx
- 优化 xxx

**安装包**

| 平台 | 文件 | 说明 |
|------|------|------|
| macOS Intel | Pyramid Notes-<version>.dmg | 拖拽安装 |
| macOS Intel | Pyramid Notes-<version>-mac.zip | 解压即用 |
| macOS Apple Silicon | Pyramid Notes-<version>-arm64.dmg | 拖拽安装 |
| macOS Apple Silicon | Pyramid Notes-<version>-arm64-mac.zip | 解压即用 |
| Windows x64 | Pyramid Notes Setup <version>.exe | 默认安装程序 |
| Windows ia32 | Pyramid Notes Setup <version>.exe | 默认安装程序 |
| Windows x64 | Pyramid Notes-<version>-win.zip | 解压即用 |
| Windows ia32 | Pyramid Notes-<version>-ia32-win.zip | 解压即用 |
```
