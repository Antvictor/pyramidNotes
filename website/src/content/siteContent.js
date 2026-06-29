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
    title: 'Keep the structure visible',
    body: 'Knowledge stays in a tree, so parent-child relationships remain clear instead of gradually turning into a flat pile of unrelated notes.',
  },
  {
    title: 'Let nodes hold the actual notes',
    body: 'Open a node and you get a full Markdown document with headings, lists, and code blocks. The tree handles structure; the node holds the body text.',
  },
  {
    title: 'Browse, search, then reshape',
    body: 'Browse by tree, search by node name or full text, then move an entire subtree without breaking the surrounding structure.',
  },
]

const englishUseCases = [
  'Course notes that need chapter structure and long-form writing',
  'Research topics that branch into sub-questions and references',
  'Technical knowledge bases that need both browsing and full-text lookup',
]

const chineseFeatures = [
  {
    title: '先把结构立住',
    body: '知识先按树状结构组织，主题之间的上下级关系会一直保留，不容易写着写着又变成一堆彼此孤立的笔记。',
  },
  {
    title: '节点承载正文数据',
    body: '树负责结构，节点打开后是一篇完整 Markdown。标题、列表、代码块和正文内容，都放在节点对应的文档里。',
  },
  {
    title: '浏览、搜索、调整放在一起',
    body: '可以按树浏览，也可以搜节点名和正文，再把整棵子树移动到更合适的位置，不用在几个工具之间来回切换。',
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
    alt: 'Pyramid Notes 树状界面截图',
  },
  en: {
    title: 'English interface',
    src: 'assets/product-media/en/en-tree-overview-desktop.png',
    alt: 'Pyramid Notes tree view screenshot',
  },
}

const localeMedia = {
  en: {
    hero: {
      label: 'Note screenshot',
      title: 'The tree handles navigation, while full Markdown expands the note itself',
      caption: 'This is the actual Pyramid Notes interface. The note body is shown in the editor, while the tree remains visible as the structure.',
      src: 'assets/product-media/en/en-editor-open-note-desktop.png',
      alt: 'Pyramid Notes editor screenshot',
    },
    gallery: [
      {
        title: 'Tree stays readable',
        body: 'Use the hierarchy to keep a domain visible instead of navigating through deep nested folders.',
        src: 'assets/product-media/en/en-tree-overview-desktop.png',
        alt: 'English tree overview screenshot',
      },
      {
        title: 'Node search and full-text search',
        body: 'Jump to a node by name or search across Markdown content when the tree grows large.',
        src: 'assets/product-media/en/en-search-fulltext-desktop.png',
        alt: 'English full-text search screenshot',
      },
      {
        title: 'Restructure freely',
        body: 'Move nodes and subtrees while keeping the surrounding topic map intact.',
        src: 'assets/product-media/en/en-node-operations-desktop.png',
        alt: 'English node operations screenshot',
      },
    ],
    workflow: {
      title: 'What the workflow actually looks like',
      body: 'Open a node from the tree, write in Markdown, go back to the hierarchy, then search when needed. The clip below was captured from the actual desktop app.',
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
      label: '正文截图',
      title: '树状结构负责定位，完整 Markdown 负责展开正文',
      caption: '这里展示的是实际 Pyramid Notes 界面。树保持结构可见，正文在编辑区里展开。',
      src: 'assets/product-media/zh/zh-editor-open-note-desktop.png',
      alt: 'Pyramid Notes 树状界面截图',
    },
    gallery: [
      {
        title: '结构始终可见',
        body: '当主题不断扩展时，树状结构仍然能帮助你看见章节、子主题和上下文关系。',
        src: 'assets/product-media/zh/zh-tree-overview-desktop.png',
        alt: '中文树视图截图',
      },
      {
        title: '节点搜索、全文搜索',
        body: '树适合浏览，搜索适合回到具体内容。节点搜索和全文搜索都放在同一个工作流里。',
        src: 'assets/product-media/zh/zh-search-fulltext-desktop.png',
        alt: '中文全文搜索截图',
      },
      {
        title: '随意调整结构',
        body: '移动节点时会连同整棵子树一起移动，更适合长期整理课程、研究或技术资料。',
        src: 'assets/product-media/zh/zh-node-operations-desktop.png',
        alt: '中文节点操作截图',
      },
    ],
    workflow: {
      title: '先看结构，再写正文，再回到结构',
      body: '真实使用时，通常就是先从树里进入节点，写 Markdown，再回到层级继续整理，需要时再用搜索定位内容。',
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
    headline: 'A structure-first Markdown knowledge tool. Choose your language and inspect the product before downloading the latest Alpha build.',
    intro:
      'Pyramid Notes organizes knowledge as a tree, with each node holding its own note body. It was built to make a personal knowledge system easier to maintain, and to avoid ending up with many notes that never connect into a system.',
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
      'A local-first structured knowledge desktop app where the tree stays visible and every node opens into a full Markdown document.',
    intro:
      'Pyramid Notes is a structure-first desktop app for organizing knowledge as a tree. The tree keeps the system visible, and each node carries the full Markdown note.',
    alphaCopy:
      'It started from a simple problem: notes kept accumulating, but the system behind them kept getting weaker. The current Alpha already supports the core loop: browse the tree, open a node, write in Markdown, return to the structure, and search across names or note content.',
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
      'The tree is responsible for structure, and each node is responsible for the note body. That split makes it easier to keep a knowledge system coherent instead of slowly accumulating notes that no longer relate clearly to one another.',
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
    headline: '一款本地优先的结构知识桌面应用：树状结构保持可见，每个节点展开后都是完整 Markdown。',
    intro:
      'Pyramid Notes 是一个结构优先的知识整理工具。它先用树状结构把知识体系组织起来，再由节点承载对应的 Markdown 正文。',
    alphaCopy:
      '这个项目最初就是为了整理自己的知识体系，避免笔记越记越多，最后只剩很多零散内容。当前 Alpha 已经覆盖核心闭环：浏览树、进入节点写 Markdown、回到结构继续整理，再按节点名或正文搜索内容。',
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
      '这里把结构和正文分开处理：树负责知识体系的层级关系，节点负责承载正文内容。这样整理出来的，不只是很多条笔记，而是一个可以一直维护下去的知识系统。',
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
