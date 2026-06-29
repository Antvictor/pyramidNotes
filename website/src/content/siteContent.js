export const supportedTargets = [
  'macos-arm64',
  'macos-x64',
  'windows-x64',
  'windows-ia32',
]

export const targetLabels = {
  en: {
    'macos-arm64': 'macOS Apple Silicon',
    'macos-x64': 'macOS Intel',
    'windows-x64': 'Windows x64',
    'windows-ia32': 'Windows 32-bit',
  },
  zh: {
    'macos-arm64': 'macOS Apple Silicon',
    'macos-x64': 'macOS Intel',
    'windows-x64': 'Windows x64',
    'windows-ia32': 'Windows 32 位',
  },
}

const englishFeatures = [
  {
    title: 'Keep hierarchy visible while writing',
    body: 'Topics stay arranged as a tree, so a course, research domain, or technical map does not collapse into disconnected files.',
  },
  {
    title: 'Open one node as one full Markdown note',
    body: 'Each node expands into a real document with headings, lists, and code blocks instead of forcing long text into a tiny canvas.',
  },
  {
    title: 'Browse, search, and restructure in one loop',
    body: 'Search names or note content, then move an entire subtree without losing the surrounding structure.',
  },
]

const englishUseCases = [
  'Course notes that need chapter structure and long-form writing',
  'Research topics that branch into sub-questions and references',
  'Technical knowledge bases that need both browsing and full-text lookup',
]

const chineseFeatures = [
  {
    title: '写作时也能一直看见层级',
    body: '课程、研究主题或技术知识会一直保持树状结构，不会在写久之后退化成一堆彼此孤立的文件名。',
  },
  {
    title: '每个节点都是一篇完整 Markdown',
    body: '节点只负责结构，正文放在完整 Markdown 文档里，标题、列表、代码块都能自然展开。',
  },
  {
    title: '浏览、搜索、调整结构是一套连贯流程',
    body: '既可以按树浏览，也可以搜节点名和正文，再把整棵子树移动到更合适的位置。',
  },
]

const chineseUseCases = [
  '需要长期维护章节层级的课程笔记',
  '会持续分叉主题的研究资料整理',
  '既要按结构浏览又要按正文搜索的技术知识库',
]

const rootMedia = {
  zh: {
    title: '中文界面',
    src: 'assets/product-media/zh/zh-tree-overview-desktop.png',
    alt: 'Pyramid Notes 中文树状界面截图',
  },
  en: {
    title: 'English interface',
    src: 'assets/product-media/en/en-tree-overview-desktop.png',
    alt: 'Pyramid Notes English tree view screenshot',
  },
}

const localeMedia = {
  en: {
    hero: {
      label: 'Real English app interface',
      title: 'Tree view with a full Markdown note behind every node',
      caption: 'The site now uses the actual Pyramid Notes interface instead of an illustrative mock preview.',
      src: 'assets/product-media/en/en-editor-open-note-desktop.png',
      alt: 'Pyramid Notes English editor screenshot',
    },
    gallery: [
      {
        title: 'Tree stays readable',
        body: 'Use the hierarchy to keep a domain visible instead of navigating through deep nested folders.',
        src: 'assets/product-media/en/en-tree-overview-desktop.png',
        alt: 'English tree overview screenshot',
      },
      {
        title: 'Search by structure or content',
        body: 'Jump to a node by name or search across Markdown content when the tree grows large.',
        src: 'assets/product-media/en/en-search-fulltext-desktop.png',
        alt: 'English full-text search screenshot',
      },
      {
        title: 'Restructure without losing context',
        body: 'Move nodes and subtrees while keeping the surrounding topic map intact.',
        src: 'assets/product-media/en/en-node-operations-desktop.png',
        alt: 'English node operations screenshot',
      },
    ],
    workflow: {
      title: 'A real workflow, not a concept sketch',
      body: 'Browse the tree, open a note, edit in Markdown, return to the hierarchy, then search across content. The clip below is captured from the actual desktop app.',
      videoLabel: 'Workflow clip',
      imageLabel: 'Static key frame',
      videoSrc: 'assets/product-media/en/en-workflow-open-edit-search.webm',
      posterSrc: 'assets/product-media/en/en-editor-open-note-desktop.png',
      videoAlt: 'English workflow demo clip',
      imageAlt: 'English workflow key frame',
    },
  },
  zh: {
    hero: {
      label: '真实中文界面',
      title: '树状结构负责定位，完整 Markdown 负责展开正文',
      caption: '这里展示的是实际 Pyramid Notes 界面，而不是用文本拼出来的示意预览。',
      src: 'assets/product-media/zh/zh-editor-open-note-desktop.png',
      alt: 'Pyramid Notes 中文编辑器截图',
    },
    gallery: [
      {
        title: '结构始终可见',
        body: '当主题不断扩展时，树状结构仍然能帮助你看见章节、子主题和上下文关系。',
        src: 'assets/product-media/zh/zh-tree-overview-desktop.png',
        alt: '中文树视图截图',
      },
      {
        title: '可以搜节点，也可以搜正文',
        body: '树适合浏览，搜索适合回到具体内容，两种入口在同一个工作流里并存。',
        src: 'assets/product-media/zh/zh-search-fulltext-desktop.png',
        alt: '中文全文搜索截图',
      },
      {
        title: '调整层级时不破坏整体结构',
        body: '移动节点时是整棵子树一起移动，适合长期整理课程、研究或技术资料。',
        src: 'assets/product-media/zh/zh-node-operations-desktop.png',
        alt: '中文节点操作截图',
      },
    ],
    workflow: {
      title: '先看结构，再写正文，再回到结构',
      body: '真实使用通常是一条闭环：先从树里进入节点，写 Markdown，再回到层级继续整理，最后通过搜索定位内容。',
      videoLabel: '流程短片',
      imageLabel: '静态关键帧',
      videoSrc: 'assets/product-media/zh/zh-workflow-open-edit-search.webm',
      posterSrc: 'assets/product-media/zh/zh-editor-open-note-desktop.png',
      videoAlt: '中文工作流演示视频',
      imageAlt: '中文工作流关键帧',
    },
  },
}

export const siteContent = {
  root: {
    productName: 'Pyramid Notes',
    headline: 'Choose your language, then inspect the real product before downloading the latest Alpha build.',
    intro:
      'Pyramid Notes combines a visible topic tree with one Markdown document per node. Pick the language that matches your audience, then review the actual desktop workflow and current release.',
    recommendationIntro: {
      zh: '根据你的浏览器语言，推荐先进入中文页面。',
      en: 'Based on your browser language, the English page is the better starting point.',
    },
    cards: {
      zh: {
        title: '中文下载页',
        body: '查看真实中文界面、安装说明和当前 Alpha 下载入口。',
        cta: '进入中文页',
      },
      en: {
        title: 'English download page',
        body: 'Inspect the real English interface, workflow, and current release guidance.',
        cta: 'Open English page',
      },
    },
    media: rootMedia,
  },
  en: {
    languageCode: 'en',
    languageName: 'English',
    productName: 'Pyramid Notes',
    alphaBadge: 'Early Alpha',
    headline:
      'A local-first knowledge tool where the tree stays visible and every node opens into a full Markdown document.',
    intro:
      'Pyramid Notes is for people who want to keep hierarchy visible while they write. It fits structured course notes, technical domains, research maps, and other topics that grow from a clear root.',
    alphaCopy:
      'The current Alpha already supports the core loop: browse the tree, open a node, write in Markdown, return to the structure, and search across names or note content.',
    primaryCtaIdle: 'Checking latest release',
    primaryCtaLabel: 'Download recommended build',
    fallbackTitle: 'Automatic recommendation unavailable',
    fallbackBody:
      'Release metadata could not be loaded right now. You can still open GitHub Releases and choose a build manually.',
    fallbackCta: 'Open GitHub Releases',
    manualLabel: 'Other supported builds',
    manualCta: 'Download',
    versionPrefix: 'Current release',
    manualRecommended: 'Recommended automatically',
    manualPrimary: 'Primary installer',
    manualSecondary: 'Secondary asset',
    unavailableLabel: 'unavailable',
    mediaGalleryTitle: 'See the actual interface',
    featuresTitle: 'What the tool is optimized for',
    features: englishFeatures,
    useCasesTitle: 'Where it fits best',
    useCases: englishUseCases,
    workflowTitle: 'A workflow built around structure first',
    workflowBody:
      'Instead of hiding structure in a sidebar or forcing long notes into a diagram, Pyramid Notes keeps the tree and the document roles separate. That makes it easier to revisit a topic months later without rebuilding context from file names alone.',
    requirementsTitle: 'System requirements',
    requirements: [
      'macOS Intel or Apple Silicon',
      'Windows x64 or Windows 32-bit environments that still rely on the shared installer path',
      'Local filesystem access for Markdown note storage',
    ],
    installTitle: 'Install notes',
    installSteps: [
      'Download the recommended build for your platform.',
      'On macOS, open the DMG and move the app into Applications.',
      'On Windows, run the installer or use the portable ZIP if you prefer a manual location.',
      'The first launch is Alpha software: expect rough edges and keep backups of important material.',
    ],
    media: localeMedia.en,
  },
  zh: {
    languageCode: 'zh',
    languageName: '简体中文',
    productName: 'Pyramid Notes',
    alphaBadge: '早期 Alpha',
    headline: '一款更像知识工具的本地优先桌面应用：树状结构保持可见，每个节点展开后都是完整 Markdown。',
    intro:
      'Pyramid Notes 适合那些天然带层级的内容：课程、研究主题、技术知识、长期项目。它不试图把所有关系都画成图，而是先把“从一个根开始生长”的结构做好。',
    alphaCopy:
      '当前 Alpha 已经覆盖核心闭环：浏览树、进入节点写 Markdown、回到结构继续整理，再按节点名或正文搜索内容。',
    primaryCtaIdle: '正在检查最新版本',
    primaryCtaLabel: '下载推荐版本',
    fallbackTitle: '自动推荐暂时不可用',
    fallbackBody:
      '当前无法读取发布元数据。你仍然可以前往 GitHub Releases 页面手动选择下载包。',
    fallbackCta: '打开 GitHub Releases',
    manualLabel: '其他支持平台',
    manualCta: '下载',
    versionPrefix: '当前版本',
    manualRecommended: '自动推荐',
    manualPrimary: '默认安装包',
    manualSecondary: '二级下载项',
    unavailableLabel: '暂不可用',
    mediaGalleryTitle: '先看真实界面，再决定是否下载',
    featuresTitle: '它更适合解决什么问题',
    features: chineseFeatures,
    useCasesTitle: '更适合这些场景',
    useCases: chineseUseCases,
    workflowTitle: '围绕真实知识整理流程来设计',
    workflowBody:
      '它不是把长内容塞进思维导图，而是把结构和正文分开：树负责说明它在哪里，Markdown 负责说明它具体是什么。这样在几个月后回看时，更容易恢复上下文。',
    requirementsTitle: '系统要求',
    requirements: [
      'macOS Intel 或 Apple Silicon',
      'Windows x64，或仍需要 32 位安装路径的 Windows 环境',
      '本地文件系统读写权限，用于存放 Markdown 笔记',
    ],
    installTitle: '安装提示',
    installSteps: [
      '先下载适合自己平台的推荐安装包。',
      '在 macOS 上，打开 DMG 并把应用拖入 Applications。',
      '在 Windows 上，可以运行安装程序，也可以选择便携 ZIP 手动解压。',
      '当前仍是 Alpha 软件，建议先用演示数据或备份后的笔记目录体验。',
    ],
    media: localeMedia.zh,
  },
}
