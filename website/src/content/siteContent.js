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
      title: 'A quick interface tour from tree to settings',
      body: 'This sequence shows the real desktop app moving through the core views: tree structure, branch operations, search, note editing, and settings. It is meant to make the interface readable before download, not to simulate a fake product flow.',
      videoLabel: 'Interface tour',
      imageLabel: 'Key frame',
      gifSrc: 'assets/product-media/en/en-workflow-open-edit-search.gif',
      gifAlt: 'English interface tour animation',
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
      title: '从树结构到设置的一段界面导览',
      body: '这段动画展示的是真实桌面应用里的几个核心界面：树结构、节点操作、搜索、正文编辑和设置。它的目标是让用户在下载前先看清界面，而不是拼接一个虚假的操作流程。',
      videoLabel: '界面导览',
      imageLabel: '关键帧',
      gifSrc: 'assets/product-media/zh/zh-workflow-open-edit-search.gif',
      gifAlt: '中文界面导览动画',
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
    headline: 'Build knowledge as a tree, not a pile of files.',
    intro:
      'Pyramid Notes is a local-first knowledge management tool for people who want their notes, research, and long-term material to grow into a durable knowledge system.',
    recommendationIntro: {
      zh: '根据你的浏览器语言，推荐先进入中文页面。',
      en: 'Based on your browser language, the English page is the better starting point.',
    },
    cards: {
      zh: {
        title: '中文下载页',
        body: '查看真实中文界面、安装说明和当前抢先体验版下载入口。',
        cta: '进入中文页',
      },
      en: {
        title: 'English download page',
        body: 'Inspect the interface, positioning, and current Early Access download guidance.',
        cta: 'Open English page',
      },
    },
    media: rootMedia,
  },
  en: {
    languageCode: 'en',
    languageName: 'English',
    productName: 'Pyramid Notes',
    brandTagline: 'Local-first knowledge management for long-term thinking',
    alphaBadge: 'Early Access',
    headline:
      'Let knowledge grow like thinking, not pile up like files.',
    intro:
      'Notes keep accumulating, but they do not automatically become a system. Pyramid Notes is a local-first knowledge management tool that helps you organize ideas, research, and study material into an evolving tree structure.',
    alphaCopy:
      'The tree holds the knowledge structure itself, while each node opens as a full Markdown document. It is built for long-term learning, technical accumulation, and research that keeps branching over time.',
    primaryCtaIdle: 'Checking latest release',
    primaryCtaLabel: 'Download Early Access',
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
    prereleaseLabel: 'Early Access',
    whySection: {
      title: 'Why Pyramid Notes exists',
      intro: 'Many note tools make recording easier, but they do not solve what happens after months of accumulation.',
      points: [
        {
          kicker: 'Problem',
          title: 'Notes keep growing, but the structure keeps fading',
          body: 'A few files are manageable. After enough articles, excerpts, and side notes, you know something was recorded, but not where it belongs in the bigger picture.',
        },
        {
          kicker: 'Response',
          title: 'Start with structure, then fill in the content',
          body: 'Pyramid Notes treats the tree as the knowledge system itself. Content still matters, but it lives inside a stable topic map instead of becoming a disconnected pile.',
        },
      ],
    },
    principlesSection: {
      title: 'From taking notes to building a knowledge system',
      intro: 'The goal is not to collect more files. The goal is to keep knowledge understandable as it grows.',
      cards: [
        {
          index: '01',
          title: 'Build the map before filling the archive',
          body: 'The tree is not a folder shell. Chapters, themes, subtopics, and research directions can all become part of the visible structure.',
        },
        {
          index: '02',
          title: 'Each node is a full Markdown knowledge unit',
          body: 'A node is not just a title. It can hold headings, lists, code, references, and longer note bodies in the exact place where that idea belongs.',
        },
        {
          index: '03',
          title: 'Knowledge changes, so structure must change too',
          body: 'As understanding deepens, old categories stop fitting. Moving a subtree should feel normal, not like rebuilding everything from scratch.',
        },
        {
          index: '04',
          title: 'Search should return content and context',
          body: 'Finding a paragraph matters. Seeing where it sits inside the larger system matters too. Search and structure work together instead of competing.',
        },
      ],
    },
    demoSectionTitle: 'How the product works in practice',
    demoSectionIntro: 'The interface keeps the structure visible while you browse, search, edit, and reorganize real material in the desktop app.',
    workflowSectionTitle: 'Interface tour',
    scenarioSectionTitle: 'Built for long-term knowledge work',
    scenarioSectionIntro: 'Pyramid Notes is not trying to replace every note app. It fits when your material needs a structure that can keep evolving over time.',
    audienceSectionTitle: 'Suitable workflows',
    audienceSectionIntro: 'Use it when structure and long-form content both matter. Avoid it when the job is mainly quick capture, cloud collaboration, or very lightweight note browsing.',
    fitTitle: 'Works well for',
    nonFitTitle: 'Less suitable for',
    downloadSectionTitle: 'Start building your knowledge system',
    downloadSectionIntro: 'This Early Access release is for people who want to try Pyramid Notes in real work and see whether a structure-first local workflow fits their material.',
    fitPoints: [
      'Course notes, language learning, or certification prep that naturally form chapters and subtopics.',
      'Research threads that keep branching into questions, references, and side investigations.',
      'Technical knowledge bases where you want both stable browsing structure and full-text retrieval.',
    ],
    nonFitPoints: [
      'Mobile-first note capture and quick inbox collection.',
      'Teams that primarily need cloud collaboration and shared workspaces.',
      'People who only want lightweight to-do notes or a simple markdown folder viewer.',
    ],
    requirementsTitle: 'System requirements',
    requirements: [
      'macOS Intel or Apple Silicon',
      'Windows x64 or Windows 32-bit environments that still rely on the shared installer path',
      'Local filesystem access for Markdown note storage',
    ],
    storySection: {
      title: 'Why I built it',
      intro: 'Pyramid Notes started as a way to solve a personal knowledge problem rather than to become a general-purpose note platform.',
      paragraphs: [
        'As study and work material kept accumulating, normal folders stopped expressing the relationships between topics. Links alone were useful, but they still did not provide a stable structure.',
        'So I started building a different model: use a tree to keep knowledge relationships visible, and use Markdown inside each node to hold the actual content.',
        'Pyramid Notes is not meant to replace every note tool. It exists for people who want a local-first way to build and maintain a long-term knowledge system.',
      ],
    },
    installTitle: 'Install notes',
    installSteps: [
      'Download the recommended build for your platform.',
      'On macOS, open the DMG and move the app into Applications.',
      'On Windows, run the installer or use the portable ZIP if you prefer a manual location.',
      'This is still Early Access software: expect rough edges and keep backups of important material.',
    ],
    media: localeMedia.en,
    demoSteps: localeMedia.en.demoSteps,
    scenarioSteps: englishScenarioSteps,
  },
  zh: {
    languageCode: 'zh',
    languageName: '简体中文',
    productName: 'Pyramid Notes',
    brandTagline: '面向长期知识积累的本地优先知识管理工具',
    alphaBadge: '抢先体验版',
    headline: '让知识像思维一样生长，而不是堆成一堆文件。',
    intro:
      '笔记会越来越多，但不会自动变成体系。Pyramid Notes 是一个本地优先的知识管理工具，帮助你把零散的想法、学习笔记和长期积累的资料整理成可以持续生长的树状知识结构。',
    alphaCopy:
      '树状结构负责承载知识体系本身，每个节点再展开为完整 Markdown 正文。它更适合长期学习、技术积累、研究整理，以及那些会不断分叉、不断重构的主题。',
    primaryCtaIdle: '正在检查最新版本',
    primaryCtaLabel: '下载抢先体验版',
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
    prereleaseLabel: '抢先体验版',
    whySection: {
      title: '为什么需要 Pyramid Notes？',
      intro: '很多笔记工具解决的是“记录”，但没有解决“长期组织”。',
      points: [
        {
          kicker: '问题',
          title: '笔记越来越多，但知识越来越难找',
          body: '刚开始几个文件就够了。半年后会变成几十篇文章、几百条记录和大量收藏摘录。你知道自己记过，却不知道它应该属于哪里。',
        },
        {
          kicker: '选择',
          title: '先建立知识结构，再填充具体内容',
          body: 'Pyramid Notes 不是先堆文件再靠回忆整理，而是先让知识拥有位置，再让 Markdown 正文承载表达，让内容之间保持稳定关联。',
        },
      ],
    },
    principlesSection: {
      title: '从记录，到构建知识体系',
      intro: '目标不是多记一点，而是在内容持续增长之后，仍然知道自己正在构建什么。',
      cards: [
        {
          index: '01',
          title: '先建立地图，再记录内容',
          body: '树不是文件夹，而是你的知识结构。章节、主题、子问题、研究方向都可以自然形成层级。',
        },
        {
          index: '02',
          title: '每个节点，都是完整的知识单元',
          body: '节点不是简单标题。它拥有自己的 Markdown 正文，代码、列表、总结、长段内容都可以直接存在于对应位置。',
        },
        {
          index: '03',
          title: '知识会变化，所以结构也应该容易变化',
          body: '随着学习深入，原来的分类会失效。你可以移动整棵子树，重新组织知识体系，而不是推倒重来。',
        },
        {
          index: '04',
          title: '找到内容，也找到它的位置',
          body: '搜索解决“找到”，结构解决“理解”。全文搜索和树结构一起工作，让你不仅找到答案，也回到它所属的知识体系。',
        },
      ],
    },
    demoSectionTitle: '产品如何在真实界面里工作',
    demoSectionIntro: '从真实桌面界面里看结构、搜索、编辑和分支调整是怎样连成一个完整工作流的。',
    workflowSectionTitle: '界面导览',
    scenarioSectionTitle: '更适合长期积累的人',
    scenarioSectionIntro: '它不是为了替代所有笔记工具，而是为那些希望建立长期知识体系的人提供另一种组织方式。',
    audienceSectionTitle: '适合用于',
    audienceSectionIntro: '当你需要结构与正文同时存在，它会比较合适；如果核心需求是随手记录、云协作或极轻量浏览，它暂时不是目标方案。',
    fitTitle: '适合用于',
    nonFitTitle: '暂时不太适合',
    downloadSectionTitle: '开始构建你的知识体系',
    downloadSectionIntro: '当前版本是持续演化中的抢先体验版，适合想在真实学习、研究或技术整理中先试用 Pyramid Notes 的用户。',
    fitPoints: [
      '课程笔记、语言学习、考试整理，这类天然有章节和子主题的内容。',
      '研究整理、论文线索、问题分叉，这类会不断长出子问题和参考材料的主题。',
      '技术知识库或长期项目资料，需要一边按结构浏览，一边按正文检索。',
    ],
    nonFitPoints: [
      '以手机随手记录为主的轻量场景。',
      '强依赖云协作、共享空间、多人同步的团队场景。',
      '只想要待办清单或简单 Markdown 文件浏览的人。',
    ],
    requirementsTitle: '系统要求',
    requirements: [
      'macOS Intel 或 Apple Silicon',
      'Windows x64，或仍需要 32 位安装路径的 Windows 环境',
      '本地文件系统读写权限，用于存放 Markdown 笔记',
    ],
    storySection: {
      title: '为什么创造 Pyramid Notes？',
      intro: '这个项目最初只是为了解决自己的问题，而不是为了做一个面向所有人的笔记平台。',
      paragraphs: [
        '随着学习和工作积累，笔记越来越多。传统文件夹很难表达知识之间的关系，单纯依赖链接也无法提供稳定结构。',
        '所以我尝试设计另一种方式：用树保存知识关系，用 Markdown 保存每个节点里的具体内容。',
        'Pyramid Notes 不是为了替代所有笔记工具，而是为那些想建立长期知识体系的人提供一个本地优先的选择。',
      ],
    },
    installTitle: '安装提示',
    installSteps: [
      '先下载适合自己平台的推荐安装包。',
      '在 macOS 上，打开 DMG 并把应用拖入 Applications。',
      '在 Windows 上，可以运行安装程序，也可以选择便携 ZIP 手动解压。',
      '当前仍是抢先体验版，建议先用演示数据或备份后的笔记目录体验。',
    ],
    media: localeMedia.zh,
    demoSteps: localeMedia.zh.demoSteps,
    scenarioSteps: chineseScenarioSteps,
  },
}
