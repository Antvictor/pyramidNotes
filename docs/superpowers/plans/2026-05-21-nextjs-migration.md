# Next.js + Milkdown Editor Migration Plan

> **Goal:** Replace Vite + React Router with Next.js Pages Router, using /tmp/milkdown-website as the exact reference. Keep Electron integration unchanged.

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. Copy means exact file copy from source to destination. Modify means specific changes to make.

---

## Architecture Summary

```
Current (Vite):
  web/src/main.jsx → App.jsx → React Router → pages/note/Node.jsx

Target (Next.js):
  pages/_app.tsx → pages/index.tsx (MindMap) → pages/note/[id].tsx (editor)
```

**Electron unchanged:** `electron/main.cjs` loads `http://localhost:5173` → must change to port 3000

**Key mapping:**
- MindMap (homepage) → `pages/index.tsx` (COPY from existing MindMap.jsx, adapt imports)
- Note editor → `pages/note/[id].tsx` (NEW, adapted from Node.jsx + milkdown-website doc-editor)
- Settings → `pages/settings.tsx` (existing settings/Settings.jsx moved up)
- doc-editor → `components/doc-editor/index.tsx` (COPY from /tmp/milkdown-website)

---

## PHASE 1: Infrastructure Setup

### Task 1.1: Update package.json - Framework Migration

**Files:**
- Modify: `web/package.json`

- [ ] **Step 1: Replace entire package.json**

Delete all Vite-specific dependencies and add Next.js. Replace `web/package.json` content with:

```json
{
  "name": "web",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "next dev --webpack",
    "build": "next build --webpack && electron-builder",
    "electron": "pnpm --filter electron run dev",
    "start": "concurrently \"pnpm run dev\" \"pnpm run electron\"",
    "lint": "next lint"
  },
  "dependencies": {
    "@codemirror/autocomplete": "^6.18.0",
    "@codemirror/commands": "^6.10.3",
    "@codemirror/lang-markdown": "^6.2.5",
    "@codemirror/language": "^6.12.3",
    "@codemirror/lint": "^6.8.1",
    "@codemirror/search": "^6.5.6",
    "@codemirror/state": "^6.6.0",
    "@codemirror/view": "^6.41.0",
    "@docsearch/css": "^4.0.0",
    "@docsearch/js": "^4.0.0",
    "@floating-ui/dom": "^1.6.5",
    "@floating-ui/react": "^0.27.0",
    "@lezer/highlight": "^1.2.1",
    "@milkdown/crepe": "7.21.1",
    "@milkdown/kit": "7.21.1",
    "@milkdown/react": "7.21.1",
    "@prosemirror-adapter/react": "^0.5.3",
    "@radix-ui/react-accordion": "^1.1.1",
    "@radix-ui/react-popover": "^1.0.5",
    "@radix-ui/react-switch": "^1.0.2",
    "@radix-ui/react-tabs": "^1.0.3",
    "@radix-ui/react-toast": "^1.1.3",
    "@tailwindcss/postcss": "^4.1.7",
    "@uiw/codemirror-theme-eclipse": "^4.25.9",
    "@uiw/codemirror-theme-nord": "^4.23.12",
    "@vercel/analytics": "^2.0.0",
    "clsx": "^2.1.1",
    "jotai": "^2.8.3",
    "jotai-effect": "^2.0.0",
    "lodash.debounce": "^4.0.8",
    "lodash.throttle": "^4.1.1",
    "lz-string": "^1.5.0",
    "nanoid": "^5.1.6",
    "next": "16.2.6",
    "react": "19.2.6",
    "react-dom": "19.2.6",
    "react-router-dom": "^7.9.5",
    "tailwind-nord": "^1.3.0",
    "tailwindcss": "^4.1.7",
    "tslib": "^2.8.1",
    "typescript": "^5.9.3"
  },
  "devDependencies": {
    "@types/node": "^25.3.3",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "concurrently": "^9.2.1",
    "electron": "^38.3.0",
    "eslint": "^9.36.0",
    "eslint-config-next": "16.2.6",
    "postcss": "^8.4.21"
  }
}
```

- [ ] **Step 2: Remove vite.config.ts**

```bash
rm web/vite.config.ts
```

- [ ] **Step 3: Commit**

```bash
git add package.json && git rm vite.config.ts && git commit -m "chore: replace Vite with Next.js"
```

---

### Task 1.2: Create Next.js and PostCSS Config

**Files:**
- Create: `web/next.config.js`
- Create: `web/postcss.config.js`

- [ ] **Step 1: Create next.config.js**

File: `web/next.config.js`

```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  skipWaiting: false,
  register: false,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
}

module.exports = withPWA(nextConfig)
```

- [ ] **Step 2: Create postcss.config.js**

File: `web/postcss.config.js`

```javascript
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

- [ ] **Step 3: Commit**

```bash
git add next.config.js postcss.config.js && git commit -m "chore: add Next.js and PostCSS config"
```

---

## PHASE 2: CSS Files (Exact Copy from milkdown-website)

### Task 2.1: Copy All CSS Files

**Files: COPY these exact files from /tmp/milkdown-website/src/styles/ to web/src/styles/**

- [ ] **Step 1: Copy crepe.css**

```bash
cp /tmp/milkdown-website/src/styles/crepe.css /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/styles/crepe.css
```

- [ ] **Step 2: Copy docsearch.css**

```bash
cp /tmp/milkdown-website/src/styles/docsearch.css /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/styles/docsearch.css
```

- [ ] **Step 3: Copy globals.css**

```bash
cp /tmp/milkdown-website/src/styles/globals.css /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/styles/globals.css
```

- [ ] **Step 4: Copy liquid.css**

```bash
cp /tmp/milkdown-website/src/styles/liquid.css /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/styles/liquid.css
```

- [ ] **Step 5: Copy playground.css**

```bash
cp /tmp/milkdown-website/src/styles/playground.css /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/styles/playground.css
```

- [ ] **Step 6: Copy prosemirror.css**

```bash
cp /tmp/milkdown-website/src/styles/prosemirror.css /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/styles/prosemirror.css
```

- [ ] **Step 7: Copy toast.css**

```bash
cp /tmp/milkdown-website/src/styles/toast.css /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/styles/toast.css
```

- [ ] **Step 8: Commit**

```bash
git add src/styles/ && git commit -m "style: copy CSS files from milkdown-website"
```

---

## PHASE 3: Providers (Exact Copy from milkdown-website)

### Task 3.1: Copy Providers

**Files: COPY from /tmp/milkdown-website/src/providers/ to web/src/providers/**

- [ ] **Step 1: Create providers directory structure**

```bash
mkdir -p /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/providers
```

- [ ] **Step 2: Copy DarkModeProvider.tsx**

```bash
cp /tmp/milkdown-website/src/providers/DarkModeProvider.tsx /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/providers/DarkModeProvider.tsx
```

- [ ] **Step 3: Copy DocSearchProvider.tsx**

```bash
cp /tmp/milkdown-website/src/providers/DocSearchProvider.tsx /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/providers/DocSearchProvider.tsx
```

- [ ] **Step 4: Copy SidePanelStateProvider.tsx**

```bash
cp /tmp/milkdown-website/src/providers/SidePanelStateProvider.tsx /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/providers/SidePanelStateProvider.tsx
```

- [ ] **Step 5: Copy providers/index.tsx**

```bash
cp /tmp/milkdown-website/src/providers/index.tsx /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/providers/index.tsx
```

**Note:** `DocSearchProvider` references Algolia which PyramidNotes doesn't use. We'll create a simplified version in Task 3.2.

- [ ] **Step 6: Commit**

```bash
git add src/providers/ && git commit -m "feat: copy providers from milkdown-website"
```

---

### Task 3.2: Modify DocSearchProvider

**Files:**
- Modify: `web/src/providers/DocSearchProvider.tsx`

DocSearchProvider references `docsearch` from Algolia which PyramidNotes doesn't need. Replace with a stub:

- [ ] **Step 1: Replace DocSearchProvider.tsx content**

File: `web/src/providers/DocSearchProvider.tsx`

```tsx
import type { FC, ReactNode } from 'react'

// PyramidNotes doesn't use Algolia DocSearch, so this is a stub provider
export const DocSearchProvider: FC<{ children: ReactNode }> = ({ children }) => {
  return <>{children}</>
}
```

- [ ] **Step 2: Commit**

```bash
git add src/providers/DocSearchProvider.tsx && git commit -m "style: stub DocSearchProvider for PyramidNotes"
```

---

## PHASE 4: Utils (Exact Copy from milkdown-website)

### Task 4.1: Copy Utils

**Files: COPY from /tmp/milkdown-website/src/utils/ to web/src/utils/**

- [ ] **Step 1: Copy compose.tsx**

```bash
cp /tmp/milkdown-website/src/utils/compose.tsx /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/utils/compose.tsx
```

- [ ] **Step 2: Copy date.ts**

```bash
cp /tmp/milkdown-website/src/utils/date.ts /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/utils/date.ts
```

- [ ] **Step 3: Copy share.ts**

```bash
cp /tmp/milkdown-website/src/utils/share.ts /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/utils/share.ts
```

- [ ] **Step 4: Copy title.ts**

```bash
cp /tmp/milkdown-website/src/utils/title.ts /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/utils/title.ts
```

- [ ] **Step 5: Copy types.ts**

```bash
cp /tmp/milkdown-website/src/utils/types.ts /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/utils/types.ts
```

- [ ] **Step 6: Copy hooks/useLinkClass.ts**

```bash
mkdir -p /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/hooks
cp /tmp/milkdown-website/src/hooks/useLinkClass.ts /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/hooks/useLinkClass.ts
```

- [ ] **Step 7: Commit**

```bash
git add src/utils/ src/hooks/ && git commit -m "feat: copy utils from milkdown-website"
```

---

## PHASE 5: Components - doc-editor (Exact Copy from milkdown-website)

### Task 5.1: Copy doc-editor Component

**Files: COPY from /tmp/milkdown-website/src/components/doc-editor/ to web/src/components/doc-editor/**

- [ ] **Step 1: Create directory**

```bash
mkdir -p /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/components/doc-editor
```

- [ ] **Step 2: Copy index.tsx (the main Doc component)**

```bash
cp /tmp/milkdown-website/src/components/doc-editor/index.tsx /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/components/doc-editor/index.tsx
```

**CRITICAL:** The milkdown-website version does NOT have an `onChange` callback. PyramidNotes needs it. We'll modify after copying.

- [ ] **Step 3: Copy Button.tsx**

```bash
cp /tmp/milkdown-website/src/components/doc-editor/Button.tsx /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/components/doc-editor/Button.tsx
```

- [ ] **Step 4: Copy iframePlugin.tsx**

```bash
cp /tmp/milkdown-website/src/components/doc-editor/iframePlugin.tsx /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/components/doc-editor/iframePlugin.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/doc-editor/ && git commit -m "feat: copy doc-editor from milkdown-website"
```

---

### Task 5.2: Modify doc-editor/index.tsx for PyramidNotes

**Files:**
- Modify: `web/src/components/doc-editor/index.tsx`

The milkdown-website version has this signature:
```tsx
const Doc: FC<{ content: string; url: string }> = ({ content, url }) => {
```

PyramidNotes needs:
```tsx
interface DocEditorProps {
  content: string
  onChange?: (content: string) => void
  url?: string
}
```

And it needs to call `onChange` when markdown updates.

- [ ] **Step 1: Replace index.tsx content**

File: `web/src/components/doc-editor/index.tsx`

```tsx
import { Crepe } from '@milkdown/crepe'
import { editorViewCtx, editorViewOptionsCtx } from '@milkdown/kit/core'
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener'
import { outline } from '@milkdown/kit/utils'
import { eclipse } from '@uiw/codemirror-theme-eclipse'
import { useEffect, useRef, useState } from 'react'

import { useDarkMode } from '@/providers'
import { iframePlugin } from './iframePlugin'

interface DocEditorProps {
  content: string
  onChange?: (content: string) => void
  url?: string
}

export default function DocEditor({ content, onChange, url }: DocEditorProps) {
  const [outlines, setOutlines] = useState<
    { text: string; level: number; id: string }[]
  >([])
  const darkMode = useDarkMode()
  const divRef = useRef<HTMLDivElement>(null)
  const loading = useRef(false)

  useEffect(() => {
    if (!divRef.current || loading.current) return
    loading.current = true
    const crepe = new Crepe({
      root: divRef.current,
      defaultValue: content,
      features: {
        [Crepe.Feature.BlockEdit]: false,
        [Crepe.Feature.Latex]: false,
      },
      featureConfigs: {
        [Crepe.Feature.CodeMirror]: {
          theme: darkMode ? undefined : eclipse,
        },
      },
    })
    const editor = crepe.editor
    editor
      .config((ctx) => {
        ctx.set(editorViewOptionsCtx, {
          attributes: {
            class: 'w-full max-w-full box-border p-4',
            spellcheck: 'false',
          },
        })

        ctx
          .get(listenerCtx)
          .mounted((ctx) => {
            setOutlines(outline()(ctx))
          })
          .markdownUpdated((ctx, markdown) => {
            const view = ctx.get(editorViewCtx)
            if (view.state?.doc) setOutlines(outline()(ctx))
            // Call onChange when content changes
            if (onChange && markdown) {
              onChange(markdown)
            }
          })
      })
      .use(iframePlugin)
      .use(listener)

    crepe.create().then(() => {
      loading.current = false
    })

    return () => {
      if (loading.current) return
      crepe.destroy()
    }
  }, [content, darkMode, onChange])

  return (
    <>
      <div className="crepe crepe-doc" ref={divRef} />
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/doc-editor/index.tsx && git commit -m "feat: adapt doc-editor for PyramidNotes with onChange callback"
```

---

## PHASE 6: Components - Other (Exact Copy from milkdown-website)

### Task 6.1: Copy Outline Component

**Files: COPY from /tmp/milkdown-website/src/components/outline/**

- [ ] **Step 1: Copy outline/index.tsx**

```bash
mkdir -p /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/components/outline
cp /tmp/milkdown-website/src/components/outline/index.tsx /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/components/outline/index.tsx
```

- [ ] **Step 2: Commit**

```bash
git add src/components/outline/ && git commit -m "feat: copy outline component"
```

---

### Task 6.2: Copy Toast Component

**Files: COPY from /tmp/milkdown-website/src/components/toast/**

- [ ] **Step 1: Copy toast/index.tsx**

```bash
mkdir -p /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/components/toast
cp /tmp/milkdown-website/src/components/toast/index.tsx /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/components/toast/index.tsx
```

- [ ] **Step 2: Commit**

```bash
git add src/components/toast/ && git commit -m "feat: copy toast component"
```

---

### Task 6.3: Copy Loading Component

**Files: COPY from /tmp/milkdown-website/src/components/loading/**

- [ ] **Step 1: Copy loading/index.tsx**

```bash
mkdir -p /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/components/loading
cp /tmp/milkdown-website/src/components/loading/index.tsx /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/components/loading/index.tsx
```

- [ ] **Step 2: Commit**

```bash
git add src/components/loading/ && git commit -m "feat: copy loading component"
```

---

### Task 6.4: Copy PWA Updater Component

**Files: COPY from /tmp/milkdown-website/src/components/pwa-updater/**

- [ ] **Step 1: Copy pwa-updater/index.tsx**

```bash
mkdir -p /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/components/pwa-updater
cp /tmp/milkdown-website/src/components/pwa-updater/index.tsx /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/components/pwa-updater/index.tsx
```

- [ ] **Step 2: Commit**

```bash
git add src/components/pwa-updater/ && git commit -m "feat: copy pwa-updater component"
```

---

### Task 6.5: Copy SVG Icon Component

**Files: COPY from /tmp/milkdown-website/src/components/svg-icon/**

- [ ] **Step 1: Copy svg-icon/index.tsx**

```bash
mkdir -p /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/components/svg-icon
cp /tmp/milkdown-website/src/components/svg-icon/index.tsx /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/components/svg-icon/index.tsx
```

- [ ] **Step 2: Commit**

```bash
git add src/components/svg-icon/ && git commit -m "feat: copy svg-icon component"
```

---

### Task 6.6: Copy Liquid Animation Component

**Files: COPY from /tmp/milkdown-website/src/components/liquid/**

- [ ] **Step 1: Copy liquid/index.tsx**

```bash
mkdir -p /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/components/liquid
cp /tmp/milkdown-website/src/components/liquid/index.tsx /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/components/liquid/index.tsx
```

- [ ] **Step 2: Copy liquid/style.module.css**

```bash
cp /tmp/milkdown-website/src/components/liquid/style.module.css /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/components/liquid/style.module.css
```

- [ ] **Step 3: Commit**

```bash
git add src/components/liquid/ && git commit -m "feat: copy liquid component"
```

---

### Task 6.7: Copy Home Components (Button, InfoCard)

**Files: COPY from /tmp/milkdown-website/src/components/home/**

- [ ] **Step 1: Create directory**

```bash
mkdir -p /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/components/home
```

- [ ] **Step 2: Copy Button.tsx**

```bash
cp /tmp/milkdown-website/src/components/home/Button.tsx /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/components/home/Button.tsx
```

- [ ] **Step 3: Copy InfoCard.tsx**

```bash
cp /tmp/milkdown-website/src/components/home/InfoCard.tsx /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/components/home/InfoCard.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/components/home/ && git commit -m "feat: copy home components"
```

---

### Task 6.8: Copy Footer Component

**Files: COPY from /tmp/milkdown-website/src/components/footer/**

- [ ] **Step 1: Create directory**

```bash
mkdir -p /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/components/footer
```

- [ ] **Step 2: Copy footer/index.tsx**

```bash
cp /tmp/milkdown-website/src/components/footer/index.tsx /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/components/footer/index.tsx
```

- [ ] **Step 3: Copy footer/vercel-banner.svg (if exists)**

```bash
cp /tmp/milkdown-website/src/components/footer/vercel-banner.svg /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/components/footer/ 2>/dev/null || true
```

- [ ] **Step 4: Modify footer/index.tsx for PyramidNotes**

File: `web/src/components/footer/index.tsx` - Replace content with PyramidNotes footer:

```tsx
import type { FC } from 'react'

const Footer: FC = () => {
  return (
    <footer className="flex w-full items-center justify-center border-t border-[var(--border)] py-4 text-sm text-[var(--text-secondary)]">
      <span>PyramidNotes © 2024</span>
    </footer>
  )
}

export default Footer
```

- [ ] **Step 5: Commit**

```bash
git add src/components/footer/ && git commit -m "feat: copy and adapt footer for PyramidNotes"
```

---

### Task 6.9: Copy Header Component (Simplified for PyramidNotes)

**Files: COPY from /tmp/milkdown-website/src/components/header/**

PyramidNotes doesn't need full navigation header. Create a simplified version that only has dark mode toggle.

- [ ] **Step 1: Create header directory**

```bash
mkdir -p /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/components/header
```

- [ ] **Step 2: Create simplified header/index.tsx**

File: `web/src/components/header/index.tsx`

```tsx
import type { FC } from 'react'
import { useSetDarkMode, useDarkMode } from '@/providers'

const Header: FC = () => {
  const darkMode = useDarkMode()
  const setDarkMode = useSetDarkMode()

  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex h-[72px] items-center justify-end border-b border-[var(--border)] bg-[var(--background)] px-4">
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="rounded-lg p-2 hover:bg-[var(--hover)]"
        aria-label="Toggle dark mode"
      >
        {darkMode ? '☀️' : '🌙'}
      </button>
    </header>
  )
}

export default Header
```

- [ ] **Step 3: Commit**

```bash
git add src/components/header/ && git commit -m "feat: create simplified header for PyramidNotes"
```

---

## PHASE 7: Pages - Create Next.js Pages

### Task 7.1: Create _document.tsx

**Files: COPY from /tmp/milkdown-website/src/pages/_document.tsx**

- [ ] **Step 1: Copy _document.tsx**

```bash
cp /tmp/milkdown-website/src/pages/_document.tsx /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/pages/_document.tsx
```

- [ ] **Step 2: Modify _document.tsx for PyramidNotes**

File: `web/src/pages/_document.tsx` - Replace content with:

```tsx
import { Head, Html, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Crepe Nord Theme Fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,300..900;1,300..900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap"
          rel="stylesheet"
        />

        {/* Material Symbols */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,400,0,0"
        />

        {/* Nunito font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,200..1000;1,200..1000&display=swap"
          rel="stylesheet"
        />

        {/* favicons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#5E81AC" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/_document.tsx && git commit -m "feat: create _document.tsx for PyramidNotes"
```

---

### Task 7.2: Create _app.tsx

**Files: Create web/src/pages/_app.tsx**

- [ ] **Step 1: Create _app.tsx**

File: `web/src/pages/_app.tsx`

```tsx
import '@/styles/globals.css'
import '@/styles/crepe.css'
import '@/styles/prosemirror.css'
import '@/styles/liquid.css'
import '@/styles/playground.css'
import '@/styles/variables.css'
import '@/styles/dark.css'
import '@milkdown/crepe/theme/common/style.css'
import type { AppProps } from 'next/app'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { LayoutProvider } from '@/providers'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <LayoutProvider>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <main style={{ flex: 1, marginTop: 72, overflow: 'auto' }}>
          <Component {...pageProps} />
        </main>
        <Footer />
      </div>
    </LayoutProvider>
  )
}
```

Note: The original PyramidNotes uses a sidebar layout. We need to preserve this. Let's keep the sidebar layout:

```tsx
import '@/styles/globals.css'
import '@/styles/crepe.css'
import '@/styles/prosemirror.css'
import '@/styles/liquid.css'
import '@/styles/playground.css'
import '@/styles/variables.css'
import '@/styles/dark.css'
import '@milkdown/crepe/theme/common/style.css'
import type { AppProps } from 'next/app'
import Header from '@/components/header'
import Sidebar from '@/components/Sidebar'
import { LayoutProvider } from '@/providers'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <LayoutProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar style={{ width: 60 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Header />
          <main style={{ flex: 1, marginTop: 72, overflow: 'auto' }}>
            <Component {...pageProps} />
          </main>
        </div>
      </div>
    </LayoutProvider>
  )
}
```

- [ ] **Step 2: Create Sidebar component**

File: `web/src/components/Sidebar.tsx`

```tsx
import Link from 'next/link'
import { useRouter } from 'next/router'

interface SidebarProps {
  style?: React.CSSProperties
}

const Sidebar = ({ style }: SidebarProps) => {
  const router = useRouter()

  const isActive = (path: string) => router.pathname === path

  return (
    <div
      style={{
        width: 60,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 16,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
        ...style,
      }}
    >
      <Link
        href="/"
        style={{
          color: isActive('/') ? 'var(--accent)' : 'var(--text-primary)',
          fontSize: 20,
          padding: '8px 0',
          textDecoration: 'none',
        }}
      >
        🗺️
      </Link>
      <Link
        href="/settings"
        style={{
          color: isActive('/settings') ? 'var(--accent)' : 'var(--text-primary)',
          fontSize: 20,
          padding: '8px 0',
          textDecoration: 'none',
        }}
      >
        ⚙️
      </Link>
    </div>
  )
}

export default Sidebar
```

- [ ] **Step 3: Create variables.css**

File: `web/src/styles/variables.css`

```css
:root {
  --background: #fdfcff;
  --text-primary: #1b1c1d;
  --text-secondary: #43474e;
  --border: #d8dee9;
  --accent: #5e81ac;
  --sidebar-bg: #eceff4;
  --link-color: #5e81ac;
  --hover: #eceef4;
}

.dark {
  --background: #1b1c1d;
  --text-primary: #f8f9ff;
  --text-secondary: #c3c6cf;
  --border: #434c5e;
  --accent: #a1c9fd;
  --sidebar-bg: #2e3440;
  --link-color: #a1c9fd;
  --hover: #32353a;
}
```

- [ ] **Step 4: Create dark.css**

File: `web/src/styles/dark.css`

```css
.dark {
  background: var(--background);
  color: var(--text-primary);
}
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/_app.tsx src/components/Sidebar.tsx src/styles/variables.css src/styles/dark.css && git commit -m "feat: create _app.tsx with sidebar layout"
```

---

### Task 7.3: Create MindMap Page (index.tsx)

**Files: Convert web/src/pages/MindMap.jsx to web/src/pages/index.tsx**

- [ ] **Step 1: Create pages directory structure**

```bash
mkdir -p /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/pages/note
mkdir -p /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/pages/commons
mkdir -p /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/pages/db
```

- [ ] **Step 2: Copy existing files to pages directory**

```bash
# Copy db, commons, note/ContextMenu, note/NodeCustom from web/src/pages/
cp /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/pages/db/db.js /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/pages/db/db.js 2>/dev/null || true
cp /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/pages/commons/OpenPrompt.jsx /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/pages/commons/OpenPrompt.jsx 2>/dev/null || true
cp -r /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/pages/note/ContextMenu /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/pages/note/ContextMenu 2>/dev/null || true
cp /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/pages/note/NodeCustom.jsx /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/pages/note/NodeCustom.jsx 2>/dev/null || true
```

- [ ] **Step 3: Create index.tsx - the MindMap page**

File: `web/src/pages/index.tsx`

This is the MindMap from `MindMap.jsx` but adapted for Next.js:
- Replace `react-router-dom` with `next/router`
- Replace `useNavigate` with `useRouter().push()`
- Use `useSearchParams` from `next/navigation`
- Import React hooks from 'react' instead of directly

```tsx
import { useRouter } from 'next/router'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import NodeCustom from './note/NodeCustom'
import db from './db/db'
import ContextMenu from './note/ContextMenu/ContextMenu'
import OpenPrompt from './commons/OpenPrompt'
import { nanoid } from 'nanoid'

const nodeTypes = { custom: NodeCustom }

function layoutTree(nodes, rootId, startX, startY, levelGap = 110) {
  const NODE_MIN_WIDTH = 30
  const H_GAP = 40

  const nodeMap = new Map()
  nodes.forEach((n) => nodeMap.set(n.id, { ...n, children: [] }))
  nodes.forEach((n) => {
    if (n.top && n.top !== '0') nodeMap.get(n.top)?.children.push(nodeMap.get(n.id))
  })

  const widthMap = new Map()
  const positions = new Map()

  const getNodeWidth = (node) => {
    const text = `${node?.name ?? ''}`
    const estimated = Math.min(220, NODE_MIN_WIDTH + text.length * 8)
    return Math.max(NODE_MIN_WIDTH, estimated)
  }

  const calcWidth = (node) => {
    const children = node.children || []
    const selfWidth = getNodeWidth(node)
    if (!children.length) {
      widthMap.set(node.id, selfWidth)
      return selfWidth
    }
    const childWidths = children.map(calcWidth)
    const childrenTotal =
      childWidths.reduce((sum, w) => sum + w, 0) + H_GAP * Math.max(0, children.length - 1)
    const subtreeWidth = Math.max(selfWidth, childrenTotal)
    widthMap.set(node.id, subtreeWidth)
    return subtreeWidth
  }

  const place = (node, depth, centerX) => {
    const y = startY + depth * levelGap
    positions.set(node.id, { x: centerX, y })

    const children = node.children || []
    if (!children.length) return

    const subtreeWidth = widthMap.get(node.id) ?? getNodeWidth(node)
    let cursorLeft = centerX - subtreeWidth / 2

    children.forEach((child) => {
      const w = widthMap.get(child.id) ?? getNodeWidth(child)
      const childCenterX = cursorLeft + w / 2
      place(child, depth + 1, childCenterX)
      cursorLeft += w + H_GAP
    })
  }

  const rootNode = nodeMap.get(rootId)
  if (rootNode) {
    calcWidth(rootNode)
    place(rootNode, 0, startX)
  }

  return positions
}

export default function MindMap() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [notesData, setNotesData] = useState(null)
  const [visible, setVisible] = useState(false)
  const [nodeAction, setNodeAction] = useState<(() => void) | undefined>()
  const [nodeId, setNodeId] = useState()
  const [title, setTitle] = useState()
  const [menu, setMenu] = useState({
    show: false,
    x: 0,
    y: 0,
    type: '',
    nodeId: '1',
    title: '',
  })

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const memoNodeTypes = useMemo(() => nodeTypes, [])

  useEffect(() => {
    db.notes.select().then((res) => {
      if (!res || res.length === 0) {
        const rootNode = { id: '1', name: 'root', content: '', alias: '', top: '0', left: '0' }
        db.notes.insert(rootNode)
        saveNode(rootNode)
        setNotesData([rootNode])
      } else {
        setNotesData(res)
      }
    })
  }, [])

  useEffect(() => {
    if (window.api?.onSettingsChanged) {
      window.api.onSettingsChanged(() => {
        db.notes.select().then((res) => {
          if (res && res.length > 0) setNotesData(res)
        })
      })
    }
  }, [])

  useEffect(() => {
    if (searchParams.get('search') === '1') {
      // Handle search - future enhancement
    }
  }, [searchParams])

  useEffect(() => {
    if (!notesData) return
    const rootNode = notesData.find((n) => '0' === n.top)
    const rootId = rootNode?.id
    const posMap = layoutTree(notesData, rootId, 50, 50)

    const initNodes = notesData.map((n) => ({
      id: n.id,
      type: 'custom',
      data: { name: n.name, label: n.name, ...n },
      position: posMap.get(n.id),
    }))

    const initEdges: any[] = []
    notesData.forEach((e) => {
      if (e.top && e.top !== '0') {
        initEdges.push({
          id: `e${e.top}-${e.id}`,
          source: e.top,
          sourceHandle: 'bottom',
          target: e.id,
          targetHandle: 'top',
          style: { stroke: 'var(--link-color)', strokeWidth: 2 },
        })
      }
      if (e.left) {
        initEdges.push({
          id: `e${e.left}-${e.id}`,
          source: e.left,
          sourceHandle: 'right',
          target: e.id,
          targetHandle: 'left',
          style: { stroke: 'var(--link-color)', strokeWidth: 2 },
        })
      }
    })

    setNodes(initNodes)
    setEdges(initEdges)
  }, [notesData, setEdges, setNodes])

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const handleFileError = (result: any) => {
    if (result?.error) return true
    return false
  }

  const saveNode = async (node: any) => {
    const yamlStr = { id: node.id, alias: '', title: node.name, left: node.left, top: node.top }
    await window.api.saveFile(`${node.id}-${node.name}.md`, yamlStr, '', node.id)
  }

  const onPaneContextMenu = useCallback((e: any) => {
    e.preventDefault()
    setMenu({ show: true, x: e.clientX, y: e.clientY, type: 'pane', nodeId: '1', title: '' })
  }, [])

  const onNodeContextMenu = useCallback((e: any, node: any) => {
    e.preventDefault()
    setMenu({ show: true, x: e.clientX, y: e.clientY, type: 'node', nodeId: node.id, title: node.data.name })
  }, [])

  const closeMenu = () => setMenu((m) => ({ ...m, show: false }))

  const addNewNode = (id: string) => {
    setVisible(true)
    setNodeId(id)
    setTitle('')
    setNodeAction(() => insertNode)
  }

  const insertNode = useCallback((parent: string, name: string) => {
    setVisible(false)
    const id = nanoid(12)
    const newNodeDb = { id: `${id}`, name: `${name}`, content: '', alias: '', top: `${parent}`, left: '' }
    db.notes.insert(newNodeDb)
    saveNode(newNodeDb)
    setNotesData((prevData) => [...(prevData || []), newNodeDb])
  }, [])

  const updateNode = (id: string, noteTitle: string) => {
    setVisible(true)
    setNodeId(id)
    setTitle(noteTitle)
    setNodeAction(() => editNode)
  }

  const editNode = useCallback(async (id: string, name: string, orginName: string) => {
    setVisible(false)
    db.notes.update({ id }, { name })
    setNotesData((nds) => nds.map((n) => (n.id === id ? { ...n, name } : n)))
    await window.api.renameFile(`${id}-${orginName}.md`, `${id}-${name}.md`)
    await window.api.updateYaml(`${id}-${name}.md`, { title: name })
  }, [])

  const deleteNode = (id: string, noteTitle: string) => {
    setNotesData((nds) => nds.filter((n) => n.id !== id))
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
    db.notes.delete({ id })
    window.api.deleteFile(`${id}-${noteTitle}.md`)
  }

  const handleNodeClick = useCallback(
    (_: any, node: any) => {
      router.push(`/note/${node.id}`)
    },
    [router]
  )

  return (
    <div style={{ width: '90vw', height: '94vh', background: 'var(--background)' }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={memoNodeTypes}
          nodesConnectable={false}
          defaultEdgeOptions={{ type: 'smoothstep', selectable: false, style: { stroke: 'var(--link-color)', strokeWidth: 2 } }}
          fitView
          onPaneContextMenu={onPaneContextMenu}
          onNodeContextMenu={onNodeContextMenu}
          nodesDraggable={false}
          panOnScroll={false}
          zoomOnScroll={true}
          panOnDrag={true}
          attributionPosition={null}
          onEdgesDelete={() => {}}
          deleteKeyCode={null}
          proOptions={{ hideAttribution: true }}
          onNodeClick={handleNodeClick}
        >
          <Background />
          <Controls />
        </ReactFlow>
        <ContextMenu
          menu={menu}
          onClose={closeMenu}
          onCreateNode={addNewNode}
          onEditNode={updateNode}
          onDeleteNode={deleteNode}
        />
        <OpenPrompt
          visible={visible}
          id={nodeId}
          title={title}
          onOk={nodeAction}
          onCancel={() => setVisible(false)}
        />
      </ReactFlowProvider>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.tsx && git commit -m "feat: create MindMap page as index.tsx"
```

---

### Task 7.4: Create Note Page (note/[id].tsx)

**Files: Create web/src/pages/note/[id].tsx**

This is adapted from `Node.jsx` but with:
- Next.js dynamic route syntax `[id].tsx`
- Next.js router instead of react-router-dom
- Crepe editor from components/doc-editor instead of core/editor/doc-editor

- [ ] **Step 1: Create note/[id].tsx**

File: `web/src/pages/note/[id].tsx`

```tsx
import { ProsemirrorAdapterProvider } from '@prosemirror-adapter/react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import DocEditor from '@/components/doc-editor'

export default function NotePage() {
  const router = useRouter()
  const { id } = router.query
  const [content, setContent] = useState('')
  const [yamlValue, setYamlValue] = useState<any>({})
  const [fileName, setFileName] = useState('')
  const [nodeName, setNodeName] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!id || typeof id !== 'string') return

    const loadFile = async () => {
      try {
        // The IPC returns { data: yamlData, content: markdownContent }
        const result = await window.api.openFile(id)
        if (result) {
          const { data, content: markdownContent } = result
          setYamlValue(data || {})
          setContent(markdownContent || '')

          // Extract node name from id (format: "nodeId-nodeName.md")
          // The id passed to router is actually the filename from MindMap
          if (typeof id === 'string' && id.includes('-')) {
            const parts = id.split('-')
            const nodeId = parts[0]
            const namePart = parts.slice(1).join('-').replace('.md', '')
            setNodeName(namePart)
            setFileName(`${nodeId}-${namePart}.md`)
          } else {
            setFileName(id)
          }

          setReady(true)
        }
      } catch (error) {
        console.error('Failed to load file:', error)
      }
    }

    loadFile()
  }, [id])

  const handleChange = async (markdownContent: string) => {
    if (!fileName || !id) return
    try {
      await window.api.saveFile(fileName, yamlValue, markdownContent, id)
    } catch (error) {
      console.error('Failed to save file:', error)
    }
  }

  if (!ready) {
    return (
      <div style={{ padding: 20, color: 'var(--text-primary)' }}>
        loading...
      </div>
    )
  }

  return (
    <div className="mx-8 pt-4 pb-10 md:mx-24 md:pb-24 lg:mx-40 xl:mx-80 2xl:mx-auto 2xl:max-w-4xl">
      <ProsemirrorAdapterProvider>
        <DocEditor content={content} onChange={handleChange} />
      </ProsemirrorAdapterProvider>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/note/\[id\].tsx && git commit -m "feat: create note/[id].tsx dynamic route"
```

---

### Task 7.5: Create Settings Page

**Files: Create web/src/pages/settings.tsx**

- [ ] **Step 1: Create settings.tsx wrapper**

File: `web/src/pages/settings.tsx`

```tsx
import Settings from './settings/Settings'

export default function SettingsPage() {
  return <Settings />
}
```

Note: We need to move the settings content. The existing `pages/settings/Settings.jsx` needs to be renamed to `pages/settings.tsx` and adapted.

- [ ] **Step 2: Check if Settings.jsx exists and copy it**

```bash
cp /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/pages/settings/Settings.jsx /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/pages/settings/Settings.tsx 2>/dev/null || true
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/settings.tsx && git commit -m "feat: create settings page"
```

---

## PHASE 8: Cleanup Old Files

### Task 8.1: Remove Old Vite Entry Files

**Files: REMOVE web/src/main.jsx and web/src/App.jsx**

- [ ] **Step 1: Remove old Vite files**

```bash
rm /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/main.jsx
rm /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/App.jsx
rm /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/pages/MindMap.jsx
```

- [ ] **Step 2: Commit**

```bash
git rm src/main.jsx src/App.jsx src/pages/MindMap.jsx && git commit -m "chore: remove old Vite entry files"
```

---

### Task 8.2: Clean Up Core Editor Directory

**Files: REMOVE old editor files no longer needed**

The old editor in `core/editor/` is being replaced by `components/doc-editor/`.

- [ ] **Step 1: Remove old editor directory**

```bash
rm -rf /Users/exccedy/project/AntVictor/app/pyramidNotes/web/src/core/editor
```

- [ ] **Step 2: Commit**

```bash
git rm -rf src/core/editor && git commit -m "chore: remove old editor (replaced by components/doc-editor)"
```

---

## PHASE 9: Build Verification

### Task 9.1: Install Dependencies and Verify Build

- [ ] **Step 1: Run pnpm install**

```bash
cd /Users/exccedy/project/AntVictor/app/pyramidNotes/web && pnpm install
```

- [ ] **Step 2: Try to run dev server**

```bash
cd /Users/exccedy/project/AntVictor/app/pyramidNotes/web && pnpm dev
```

Expected: Next.js dev server starts on port 3000

- [ ] **Step 3: Fix any import/build errors**

Common issues to watch for:
- Missing `@milkdown/kit` imports → check package.json
- CSS `@reference` syntax issues → verify postcss.config.js is correct
- Missing components → ensure all COPY tasks completed
- Import path issues → use relative imports if `@/` alias doesn't work

- [ ] **Step 4: Commit any fixes**

```bash
git add -A && git commit -m "fix: resolve build issues"
```

---

### Task 9.2: Test with Electron

- [ ] **Step 1: Update Electron main.cjs port if needed**

Check `electron/main.cjs` - if it loads port 5173 (Vite), change to 3000 (Next.js default):

```javascript
// Should be:
win.loadURL("http://localhost:3000");
```

- [ ] **Step 2: Run full app**

```bash
cd /Users/exccedy/project/AntVictor/app/pyramidNotes/web && pnpm start
```

This runs both Next.js dev server and Electron concurrently.

- [ ] **Step 3: Verify MindMap loads**

Navigate to http://localhost:3000 - should see MindMap

- [ ] **Step 4: Click a node and verify note opens**

Click on any node → should navigate to `/note/[nodeId]` and display Crepe editor with content

- [ ] **Step 5: Type in editor and verify auto-save**

Make a change → verify the file is saved via IPC

- [ ] **Step 6: Final commit**

```bash
git add -A && git commit -m "feat: complete Next.js migration with milkdown-website architecture"
```

---

## File Summary

| Source | Destination | Operation |
|--------|-------------|-----------|
| `/tmp/milkdown-website/src/styles/*` | `web/src/styles/*` | COPY (7 files) |
| `/tmp/milkdown-website/src/providers/*` | `web/src/providers/*` | COPY (4 files) |
| `/tmp/milkdown-website/src/utils/*` | `web/src/utils/*` | COPY (5 files) |
| `/tmp/milkdown-website/src/components/doc-editor/*` | `web/src/components/doc-editor/*` | COPY then MODIFY |
| `/tmp/milkdown-website/src/components/outline/*` | `web/src/components/outline/*` | COPY |
| `/tmp/milkdown-website/src/components/toast/*` | `web/src/components/toast/*` | COPY |
| `/tmp/milkdown-website/src/components/loading/*` | `web/src/components/loading/*` | COPY |
| `/tmp/milkdown-website/src/components/pwa-updater/*` | `web/src/components/pwa-updater/*` | COPY |
| `/tmp/milkdown-website/src/components/svg-icon/*` | `web/src/components/svg-icon/*` | COPY |
| `/tmp/milkdown-website/src/components/liquid/*` | `web/src/components/liquid/*` | COPY |
| `/tmp/milkdown-website/src/components/home/*` | `web/src/components/home/*` | COPY |
| `/tmp/milkdown-website/src/components/footer/*` | `web/src/components/footer/*` | COPY then MODIFY |
| `/tmp/milkdown-website/src/pages/_document.tsx` | `web/src/pages/_document.tsx` | COPY then MODIFY |
| `/tmp/milkdown-website/src/pages/_app.tsx` | `web/src/pages/_app.tsx` | CREATE new |
| `web/src/pages/MindMap.jsx` | `web/src/pages/index.tsx` | CONVERT |
| `web/src/pages/note/Node.jsx` | `web/src/pages/note/[id].tsx` | CONVERT |
| `web/src/pages/settings/Settings.jsx` | `web/src/pages/settings.tsx` | CONVERT |
| DELETE | `web/src/main.jsx` | REMOVE |
| DELETE | `web/src/App.jsx` | REMOVE |
| DELETE | `web/src/vite.config.ts` | REMOVE |
| DELETE | `web/src/core/editor/` | REMOVE |

## Plan Complete

Save this plan to: `docs/superpowers/plans/2026-05-21-nextjs-migration.md`