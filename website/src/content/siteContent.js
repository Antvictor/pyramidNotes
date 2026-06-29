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
      label: 'Product interface',
      title: 'The tree stays visible while the note body opens as full Markdown',
      caption: 'The interface keeps structure on one side and long-form note writing on the other, so you do not lose context while expanding a topic.',
      src: 'assets/product-media/en/en-editor-open-note-desktop.png',
      alt: 'Pyramid Notes editor screenshot',
    },
    demoSteps: [
      {
        eyebrow: '01',
        title: 'See the topic map before it becomes a note pile',
        body: 'The tree is not a side feature. It is the main frame for browsing chapters, subtopics, and how a knowledge area is expanding over time.',
        mediaLabel: 'Tree overview',
        mediaType: 'image',
        src: 'assets/product-media/en/en-tree-overview-desktop.png',
        alt: 'English tree overview screenshot',
        zoom: { scale: 1.35, origin: '50% 50%' },
      },
      {
        eyebrow: '02',
        title: 'Jump by node name or full-text search',
        body: 'When the hierarchy grows large, search brings you back to the exact node or paragraph you need without breaking the overall structure-first workflow.',
        mediaLabel: 'Search view',
        mediaType: 'image',
        src: 'assets/product-media/en/en-search-fulltext-desktop.png',
        alt: 'English full-text search screenshot',
        zoom: { scale: 1.35, origin: '50% 50%' },
      },
      {
        eyebrow: '03',
        title: 'Reshape branches instead of rewriting the system',
        body: 'Move nodes and subtrees into better positions as the material evolves. The surrounding topic map stays intact, so reorganizing is part of the normal workflow.',
        mediaLabel: 'Node operations',
        mediaType: 'image',
        src: 'assets/product-media/en/en-node-operations-desktop.png',
        alt: 'English node operations screenshot',
        zoom: { scale: 1.35, origin: '35% 55%' },
      },
      {
        eyebrow: '04',
        title: 'Write inside a node instead of leaving the structure behind',
        body: 'Each node opens as a real Markdown document with headings, lists, and longer note bodies, so the tree remains a system rather than just a folder shell.',
        mediaLabel: 'Editor view',
        mediaType: 'image',
        src: 'assets/product-media/en/en-editor-open-note-desktop.png',
        alt: 'English editor screenshot',
        zoom: { scale: 1.35, origin: '0% 0%' },
      },
    ],
    workflow: {
      title: 'What the actual workflow looks like',
      body: 'Open a node from the tree, write in Markdown, return to the structure, then search when needed. This clip is captured from the real desktop app and sits between feature understanding and scenario fit.',
      videoLabel: 'Workflow clip',
      imageLabel: 'Key frame',
      gifSrc: 'assets/product-media/en/en-workflow-open-edit-search.gif',
      gifAlt: 'English workflow demo clip',
    },
  },
  zh: {
    hero: {
      label: '产品界面',
      title: '树状结构保持可见，节点正文在旁边完整展开',
      caption: '界面把结构和正文放在同一个工作区里：一侧保持知识层级，一侧展开 Markdown 正文，写内容时不会丢掉上下文。',
      src: 'assets/product-media/zh/zh-editor-open-note-desktop.png',
      alt: 'Pyramid Notes 编辑器截图',
    },
    demoSteps: [
      {
        eyebrow: '01',
        title: '先看见整张知识地图，再决定写到哪里',
        body: '树状结构不是附属导航，而是知识体系本身。章节、分支、子主题都能一直看见，不容易慢慢写成一堆互相脱节的笔记。',
        mediaLabel: '树视图',
        mediaType: 'image',
        src: 'assets/product-media/zh/zh-tree-overview-desktop.png',
        alt: '中文树视图截图',
        zoom: { scale: 1.35, origin: '50% 50%' },
      },
      {
        eyebrow: '02',
        title: '节点搜索和全文搜索放在同一个工作流里',
        body: '当树越来越大时，可以先按节点名定位，也可以直接按正文内容搜索，再回到原来的结构继续整理，不用切换到另一套工具。',
        mediaLabel: '搜索视图',
        mediaType: 'image',
        src: 'assets/product-media/zh/zh-search-fulltext-desktop.png',
        alt: '中文全文搜索截图',
        zoom: { scale: 1.35, origin: '50% 50%' },
      },
      {
        eyebrow: '03',
        title: '需要重构时，移动整棵子树而不是推倒重来',
        body: '随着内容增长，主题边界会变化。你可以直接移动节点和分支，把材料调整到更合适的位置，而不是重新搭一套目录。',
        mediaLabel: '结构调整',
        mediaType: 'image',
        src: 'assets/product-media/zh/zh-node-operations-desktop.png',
        alt: '中文节点操作截图',
        zoom: { scale: 1.35, origin: '35% 55%' },
      },
      {
        eyebrow: '04',
        title: '进入节点后，正文就是完整 Markdown',
        body: '节点不是一句标题，而是一篇真正可以持续写下去的正文。标题、列表、代码块和长段内容都可以自然放进同一个节点里。',
        mediaLabel: '正文编辑',
        mediaType: 'image',
        src: 'assets/product-media/zh/zh-editor-open-note-desktop.png',
        alt: '中文编辑器截图',
        zoom: { scale: 1.35, origin: '0% 0%' },
      },
    ],
    workflow: {
      title: '真实整理流程是什么样子',
      body: '通常会先从树里进入节点，再写 Markdown，然后回到结构继续整理，最后在需要时用搜索快速定位。这段视频展示的是实际桌面应用里的完整片段。',
      videoLabel: '流程短片',
      imageLabel: '关键帧',
      gifSrc: 'assets/product-media/zh/zh-workflow-open-edit-search.gif',
      gifAlt: '中文工作流演示动画',
    },
  },
}

const englishScenarioSteps = [
  {
    kicker: 'Scenario 01',
    title: 'Course notes that need a durable chapter structure',
    body: 'Use it when lecture notes cannot stay flat. Chapters, subtopics, exercises, and references all benefit from being kept in a visible hierarchy while each node still carries long-form Markdown.',
    accent: 'Structured study notes',
  },
  {
    kicker: 'Scenario 02',
    title: 'Research topics that branch into questions and references',
    body: 'A research thread rarely grows in one line. New questions, supporting evidence, and side branches can split naturally into subtrees without losing the relationship back to the main theme.',
    accent: 'Branching research maps',
  },
  {
    kicker: 'Scenario 03',
    title: 'Technical knowledge bases that need browsing and retrieval',
    body: 'If you need both a stable topic map and fast text lookup, Pyramid Notes fits better than a folder pile or a giant single document. You can browse first, search second, and still keep the same system.',
    accent: 'Searchable knowledge systems',
  },
]

const chineseScenarioSteps = [
  {
    kicker: '场景 01',
    title: '需要长期维护章节层级的课程笔记',
    body: '如果你的学习资料不是零散摘录，而是有章节、有分支、有习题和参考材料的体系化内容，这种“树负责结构、节点负责正文”的形式会更稳。',
    accent: '结构化学习笔记',
  },
  {
    kicker: '场景 02',
    title: '会持续分叉问题和材料的研究整理',
    body: '研究资料往往不会沿着单线生长。问题、子问题、线索、参考文献都会不断分叉，树状结构更适合把这些关系一起保留下来。',
    accent: '分叉式研究地图',
  },
  {
    kicker: '场景 03',
    title: '既要按结构浏览又要按正文检索的技术知识库',
    body: '如果你既需要一张稳定的主题地图，又需要快速按正文找回内容，它会比文件夹堆积或单篇超长文档更合适。',
    accent: '可搜索的知识系统',
  },
]

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
    demoSectionTitle: 'Product walkthrough',
    demoSectionIntro: 'See how Pyramid Notes handles structure, search, editing, and reorganization in the actual desktop interface.',
    workflowSectionTitle: 'Workflow demo',
    scenarioSectionTitle: 'Best-fit scenarios',
    scenarioSectionIntro: 'Pyramid Notes is not trying to replace every note app. It fits best when your material needs a visible structure and long-form writing at the same time.',
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
    demoSteps: localeMedia.en.demoSteps,
    scenarioSteps: englishScenarioSteps,
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
    demoSectionTitle: '功能演示',
    demoSectionIntro: '从真实界面里看结构、搜索、编辑和调整分支这几个核心环节是怎样连接在一起的。',
    workflowSectionTitle: '流程演示',
    scenarioSectionTitle: '适用场景',
    scenarioSectionIntro: '它不是所有笔记工具的替代品，而是更适合那些既要结构清晰、又要承载长正文内容的整理场景。',
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
    demoSteps: localeMedia.zh.demoSteps,
    scenarioSteps: chineseScenarioSteps,
  },
}
