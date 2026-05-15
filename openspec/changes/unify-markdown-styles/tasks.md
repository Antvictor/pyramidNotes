## 1. CSS Refactoring in core/editor/css/markdown.css

- [x] 1.1 Replace hardcoded h1 font-size (2.0em) with var(--font-size-h1)
- [x] 1.2 Replace hardcoded h2 font-size (1.8em !important) with var(--font-size-h2)
- [x] 1.3 Replace hardcoded h3 font-size (1.6em !important) with var(--font-size-h3)
- [x] 1.4 Replace hardcoded h4 font-size (1.4em !important) with var(--font-size-h4)
- [x] 1.5 Replace hardcoded h5 font-size (1.2em !important) with var(--font-size-h5)
- [x] 1.6 Replace hardcoded font-weight (bold) with var(--font-weight-h*)
- [x] 1.7 Replace hardcoded code background (var(--bg-markdown)) with var(--color-code-bg)
- [x] 1.8 Remove all !important declarations from heading styles

## 2. Verification

- [x] 2.1 Verify .md-preview h1 displays at 2em
- [x] 2.2 Verify .md-preview h2 displays at 1.5em (no !important override)
- [x] 2.3 Verify .md-preview h3 displays at 1.25em (no !important override)
- [x] 2.4 Confirm both .md-preview and .cm-md-inline use identical CSS variable values