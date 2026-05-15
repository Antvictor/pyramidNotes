## Why

The Markdown rendering in the editor uses two different CSS files with conflicting selectors and values. `web/src/core/editor/css/markdown.css` targets `.md-preview` with hardcoded values and `!important` overrides, while `web/src/pages/note/markdown.css` targets `.cm-md-inline`. This creates inconsistent styling and makes maintenance difficult.

## What Changes

- Consolidate all markdown styling into a single CSS file using unified CSS variables from `variables.css`
- Update `web/src/core/editor/css/markdown.css` to use CSS variables instead of hardcoded values
- Ensure `.md-preview` (used by `livePreview.ts`) and `.cm-md-inline` (used by `blockPreview.ts`) both receive consistent styling via shared CSS variable system
- Remove `!important` overrides that cause unexpected sizing conflicts

## Capabilities

### New Capabilities
- `markdown-styling-unified`: Define unified CSS variable-based markdown styling system

### Modified Capabilities
- None (CSS-only refactoring, no spec behavior changes)

## Impact

- **Affected files:**
  - `web/src/core/editor/css/markdown.css` - Replace hardcoded values with CSS variables
- **No breaking changes** - Class names remain unchanged (required by third-party libraries)
- **Easier maintenance** - Single source of truth for markdown typography values