# Pyramid Notes 双语发布路线图

本路线图用于记录从应用国际化到官网和平台推广落地的独立 OpenSpec changes。每个 change 单独执行一次 `openspec-full-cycle`，完成手动验证和归档后再进入下一个。

所有内容当前仅保存在本地工作区。除非用户另行明确授权，不执行 `git commit`、`git push`、GitHub Pages 发布、Release 发布或 Cloudflare 配置变更。

## 执行顺序

### 1. `internationalize-desktop-app`

**目标：** 为桌面应用提供完整、真实的简体中文和英文界面。

**范围：**

- 建立集中式 i18n 基础设施和翻译资源。
- 覆盖思维导图、编辑器外围、搜索、设置、快捷键、帮助、教程、上下文菜单、确认框、权限错误、加载和空状态。
- 语言设置支持“跟随系统、简体中文、English”。
- 语言切换即时生效并持久化。
- 当前尚无实际用户，不保留无效旧配置的兼容迁移；首次启动默认跟随操作系统语言。
- 用户明确选择后持久化为“跟随系统、简体中文或 English”。
- 去除教程系统对中文按钮文本（例如“配置”）的硬编码依赖，改用稳定标识。
- 添加中英文资源完整性和关键界面测试。

**主要影响文件：**

- `electron/common/settings.cjs`
- `electron/ipc/settings.cjs`
- `electron/preload.cjs`
- `web/package.json`
- `web/src/main.jsx`
- `web/src/App.jsx`
- `web/src/components/node-search.tsx`
- `web/src/components/tutorial/*`
- `web/src/components/ui/*dialog*`
- `web/src/pages/MindMap.jsx`
- `web/src/pages/Sidebar.jsx`
- `web/src/pages/About.jsx`
- `web/src/pages/Home.jsx`
- `web/src/pages/commons/OpenPrompt.jsx`
- `web/src/pages/note/ContextMenu/ContextMenu.jsx`
- `web/src/pages/note/Node.jsx`
- `web/src/pages/settings/Settings.jsx`
- `web/src/pages/settings/ShortcutsModal.jsx`
- `web/src/pages/settings/HelpModal.jsx`
- 新增 `web/src/i18n/` 翻译与初始化文件

**非目标：**

- 不翻译用户笔记内容或节点名称。
- 不增加第三种语言。
- 不在此 change 中建设官网或制作推广素材。

**依赖：** 无。后续所有英文截图和海外推广都依赖此 change。

---

### 2. `build-bilingual-download-site`

**目标：** 建设面向普通用户的中英文官方下载页，并通过 GitHub Pages 发布。

**范围：**

- 新增独立静态官网目录，不复用应用运行时代码。
- 提供 `/zh/` 和 `/en/` 独立路径。
- `/` 根据浏览器语言推荐跳转，同时保留手动切换。
- 展示真实产品截图、功能、Alpha 状态、系统要求和安装提示。
- 从 GitHub Releases 获取最新可下载版本。
- 自动推荐 Windows 或 macOS，并为 macOS 区分 Apple Silicon 与 Intel。
- GitHub API 或下载识别失败时提供清晰降级入口。
- 配置双语 SEO、Open Graph、canonical 和 `hreflang`。
- 新增 GitHub Pages 部署 workflow。
- 提供 Cloudflare DNS、自定义域名和缓存配置说明，但不自动修改 Cloudflare。

**主要影响文件：**

- 新增 `website/`
- 新增 `.github/workflows/pages.yml`
- 可能调整 `.gitignore`
- 新增官网部署文档

**非目标：**

- 安装包继续由 GitHub Releases 托管。
- 不将安装包复制进 GitHub Pages 仓库。
- 不在此 change 中操作真实域名或 Cloudflare 控制台。
- 不在此 change 中制作完整平台推广文章。

**依赖：** `internationalize-desktop-app`，因为英文官网必须展示真实英文界面。

---

### 3. `create-bilingual-demo-workspaces`

**目标：** 准备可重复使用、不会污染真实笔记的中英文演示数据。

**范围：**

- 中文演示主题：操作系统学习笔记。
- 英文演示主题：Distributed Systems Notes。
- 为每套数据定义节点层级、Markdown 正文、搜索关键词和演示操作路径。
- 数据存放在仓库内的演示源目录，通过明确步骤复制到独立应用存储目录。
- 不读取、修改或展示用户真实笔记。
- 验证两套数据都能正常扫描、编辑、搜索和移动节点。

**主要影响文件：**

- 新增 `demo-data/zh/`
- 新增 `demo-data/en/`
- 新增演示数据安装与清理说明
- 如确有必要，新增只操作演示目录的辅助脚本

**非目标：**

- 不向正式安装包默认写入示例数据。
- 不自动覆盖当前应用存储目录。
- 不在此 change 中截图或录屏。

**依赖：** `internationalize-desktop-app`。

---

### 4. `produce-bilingual-product-media`

**目标：** 从本地真实应用生成官网和推广所需的双语截图、GIF 与短视频。

**范围：**

- 使用独立中英文演示目录启动已安装的 Pyramid Notes。
- 生成首页树、Markdown 编辑器、节点操作、搜索、设置和语言切换截图。
- 录制“创建节点 → 编辑 Markdown → 返回树 → 全文搜索”的短流程。
- 输出网站横屏、Product Hunt、X、Reddit、小红书和公众号需要的尺寸。
- AI 仅用于背景、装饰和非产品 UI 的宣传视觉。
- 为无法自动生成的素材提供可复制的图像提示词。
- 对素材执行隐私、语言一致性和功能真实性检查。

**主要影响文件：**

- 新增 `website/assets/` 或官网约定的媒体目录
- 新增 `docs/marketing/assets/`
- 新增素材清单、录制脚本和提示词

**非目标：**

- 不使用 AI 伪造应用界面。
- 不读取或录制真实笔记。
- 不在此 change 中发布任何帖子。

**依赖：**

- `internationalize-desktop-app`
- `create-bilingual-demo-workspaces`
- 官网媒体路径需与 `build-bilingual-download-site` 约定一致

---

### 5. `generate-publish-ready-marketing-packages`

**目标：** 将现有指导型内容改造成每个平台可直接复制发布的成品包。

**范围：**

- 每个平台保留独立目录。
- 每个平台新增 `ready-to-publish/`。
- 提供最终标题、正文、标签、首评、链接放置方式和素材引用。
- 中文平台按本地文化语境重写，不共享同一篇改写稿。
- 海外平台使用原生英文表达，不逐句翻译中文。
- 面向开发者的平台直接提供 GitHub 地址。
- 面向普通用户的平台优先提供自定义域名官网地址。
- 所有文案使用真实版本、真实下载页和已生成素材。

**主要影响文件：**

- `docs/marketing/china/*/ready-to-publish/`
- `docs/marketing/global/*/ready-to-publish/`
- `docs/marketing/README.md`
- 平台素材引用清单

**非目标：**

- 不自动登录或发布到第三方平台。
- 不伪造用户评价、下载量或社区反馈。

**依赖：**

- `build-bilingual-download-site`
- `produce-bilingual-product-media`

---

### 6. `harden-release-download-contract`

**目标：** 让官网自动下载逻辑长期可维护，不依赖模糊的文件名猜测。

**范围：**

- 统一 Release 资产命名规则。
- 明确 macOS Intel、macOS Apple Silicon、Windows x64 和可选 Windows x86 的下载映射。
- 在 Release workflow 中验证预期资产是否齐全。
- 为官网提供稳定的 release metadata 或经过测试的 GitHub API 解析规则。
- 明确 Alpha / prerelease 与“最新版本”的选择策略。
- 增加下载映射测试和发布前检查。

**主要影响文件：**

- `.github/workflows/release.yml`
- 官网 release 解析模块和测试
- `docs/BUILD.md`
- `docs/RELEASE.md`

**非目标：**

- 不改变 Electron 应用核心功能。
- 不迁移安装包存储服务。

**依赖：**

- 可以与 `build-bilingual-download-site` 同期设计。
- 应在官网正式公开前完成。

## 推荐执行路线

1. `internationalize-desktop-app`
2. `create-bilingual-demo-workspaces`
3. `harden-release-download-contract`
4. `build-bilingual-download-site`
5. `produce-bilingual-product-media`
6. `generate-publish-ready-marketing-packages`

## 状态

| Change | 状态 |
|---|---|
| `internationalize-desktop-app` | 已归档 |
| `create-bilingual-demo-workspaces` | 已完成，待归档 |
| `harden-release-download-contract` | 进行中 |
| `build-bilingual-download-site` | 待开始 |
| `produce-bilingual-product-media` | 待开始 |
| `generate-publish-ready-marketing-packages` | 待开始 |
