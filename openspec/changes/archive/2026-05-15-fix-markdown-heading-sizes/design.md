## Context

The `markdown.css` file contains styles for markdown preview content using the `.md-preview` selector. However, the `blockPreviewPlugin` renders inline previews with the class `cm-md-inline`, not `.md-preview`. This mismatch causes all styles to be silently ignored in the editor.

## Goals / Non-Goals

**Goals:**
- Apply proper heading sizes (h1: 2em, h2: 1.5em, h3: 1.25em) in editor preview
- Fix CSS selector to match actual DOM class used by `blockPreviewPlugin`

**Non-Goals:**
- No changes to markdown.ts or blockPreviewPlugin logic
- No changes to the preview rendering mechanism

## Decisions

1. **Change CSS selector from `.md-preview` to `.cm-md-inline`**
   - The `PreviewWidget` in `blockPreview.ts` sets `el.className = "cm-md-inline"`
   - All inline preview content is wrapped in this class

2. **Keep existing CSS rules structure**
   - Rules like `font-size`, `font-weight`, `margin`, etc. are already correct
   - Only the class selector needs updating

## Risks / Trade-offs

- **Risk:** Other components might rely on `.md-preview` selector
  - **Mitigation:** Search shows `.md-preview` is only used in `markdown.css` for styling
- **Risk:** Preview might have different styling contexts (livePreview.ts uses different class)
  - **Mitigation:** Only changing the selector for heading styles, other styles remain compatible