## Why

当前官网已经开始依赖真实产品截图和工作流短片，但现有素材存在两个明显问题：

1. **静态截图清晰度不足**
   - 现有官网截图来自 `1440x980` 输出，对普通卡片尚可，但对 Hero 和大舞台功能演示区偏小。
   - 在官网大图展示位里，节点文字、搜索结果和编辑区细节不够清楚，用户需要单独打开图片放大后才更清晰。

2. **工作流短片质量和节奏不适合官网**
   - 当前 `webm` 文件极小，说明编码过于激进，不适合展示桌面 UI 文字细节。
   - 当前帧率和步骤停留时间偏短，导致“创建节点 → 编辑 Markdown → 返回树 → 搜索”的流程看不清。

仓库里已经有自动化截图与工作流录制脚本，因此更合理的方案不是手工零散替换素材，而是：

- 先建立一份官网素材采集规范
- 再升级现有自动化脚本参数与输出能力
- 最后重新生成中英文 website 所需截图与 `webm`

## What Changes

1. **新增官网素材采集规范**
   - 定义截图窗口尺寸、输出分辨率、取景原则、语言一致性与隐私检查项
   - 定义 workflow 录制的分步停留时长、目标帧率、推荐时长和编码原则

2. **升级静态截图自动化脚本**
   - 提高默认输出尺寸
   - 使脚本更适合 Hero 和大舞台演示位的高清截图生成
   - 保持中英文截图场景一致

3. **升级 workflow 录制自动化脚本**
   - 提高视频清晰度
   - 调整录制帧率与每步停留时长
   - 输出更适合官网嵌入的大尺寸 `webm`

4. **重新生成 website 使用的双语产品媒体**
   - 中英文首页树视图
   - 编辑器正文截图
   - 节点操作截图
   - 搜索截图
   - 更慢更清晰的 workflow `webm`

5. **本次范围聚焦 website-first**
   - 优先解决官网用图和官网 `webm`
   - 规范文档中为后续营销平台尺寸预留扩展，但这次不一次性生成全部平台素材

## Capabilities

### New Capabilities

- `website-product-media-spec`: 为官网截图和 workflow 视频定义统一采集与质量标准
- `website-product-media-regeneration`: 使用自动化脚本重新生成双语高清官网媒体

### Modified Capabilities

- `capture-product-media`: 静态截图脚本输出更适合官网大图展示的尺寸和质量
- `capture-product-workflow`: 工作流短片生成更清晰、节奏更慢、可读性更高的 `webm`

## Impact

- **新增文件**
  - `openspec/changes/produce-bilingual-product-media/proposal.md`
  - `openspec/changes/produce-bilingual-product-media/design.md`
  - `openspec/changes/produce-bilingual-product-media/tasks.md`
  - `docs/marketing/assets/` 下的官网素材规范文档

- **修改文件**
  - `scripts/capture-product-media.mjs`
  - `scripts/capture-product-workflow.mjs`
  - `website/assets/product-media/{zh,en}/` 下重新生成的素材

- **非目标**
  - 本次不制作 Product Hunt / X / Reddit / 小红书 / 公众号全尺寸营销图
  - 不伪造产品 UI，不用 AI 伪造应用界面
  - 不读取或录制真实笔记数据
