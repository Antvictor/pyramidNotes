## Context

Two CSS files handle markdown styling:
1. `web/src/core/editor/css/markdown.css` - uses `.md-preview` selector with hardcoded values and `!important`
2. `web/src/pages/note/markdown.css` - uses `.cm-md-inline` selector with CSS variables

The `livePreview.ts` plugin creates elements with `className = "md-preview"`, while `blockPreview.ts` creates elements with `className = "cm-md-inline"`. Both class names cannot change as they are used by third-party library parsing.

## Goals / Non-Goals

**Goals:**
- Replace hardcoded values in `core/editor/css/markdown.css` with CSS variables from `variables.css`
- Ensure both `.md-preview` and `.cm-md-inline` receive identical styling rules via shared CSS variable system
- Remove `!important` declarations that cause unexpected heading size conflicts

**Non-Goals:**
- Do not change any class names (required by third-party libraries)
- Do not merge the two CSS files into one (they serve different rendering contexts)
- Do not modify the markdown rendering logic

## Decisions

1. **Use CSS variable imports**
   - `variables.css` already defines `--font-size-h1` through `--font-size-h6`
   - `core/editor/css/markdown.css` will import from `variables.css` or reference the same custom properties

2. **Add `.md-preview` rules using CSS variables**
   - Replace hardcoded `font-size: 2.0em` with `var(--font-size-h1)`
   - Replace hardcoded `font-size: 1.8em !important` with `var(--font-size-h2)`
   - Same pattern for h3-h6
   - Remove all `!important` declarations

3. **Create unified styling block for `.md-preview` and `.cm-md-inline`**
   - Both classes will share identical styling rules
   - Uses same CSS variable references for consistency

## Risks / Trade-offs

- **Risk:** `variables.css` might not be loaded in all contexts where `core/editor/css/markdown.css` is used
  - **Mitigation:** CSS variables are globally available via `@theme inline` when variables.css is loaded
- **Risk:** Removing `!important` could allow other CSS rules to override unexpectedly
  - **Mitigation:** CSS variables maintain specificity hierarchy naturally