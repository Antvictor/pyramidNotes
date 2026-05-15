## Why

Markdown headings (h2, h3) in the editor are displaying at the same size as body text, making them indistinguishable. The CSS rules in `markdown.css` target `.md-preview` class, but the actual preview plugin uses `.cm-md-inline` class instead. This causes heading styles to be silently ignored.

## What Changes

- Fix CSS selector in `web/src/pages/note/markdown.css` to target `.cm-md-inline` instead of `.md-preview`
- Ensure heading hierarchy (h1: 2em, h2: 1.5em, h3: 1.25em) is properly applied in the editor preview
- The markdown.css styles for preview (headings, code blocks, lists, blockquotes, tables) should apply to the inline preview rendered by `blockPreviewPlugin`

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- None (CSS fix only, no spec behavior changes)

## Impact

- **Affected files:**
  - `web/src/pages/note/markdown.css` - CSS selector fix
- **No breaking changes** - purely visual fix for editor preview