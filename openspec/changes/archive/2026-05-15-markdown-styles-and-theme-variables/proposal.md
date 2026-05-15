## Why

Markdown content is currently displayed with minimal styling. Headings (h1-h6), code blocks, lists, and other elements lack visual hierarchy and polish. Additionally, CSS values are hardcoded throughout, making it difficult to implement theme switching (dark/light mode) or custom themes later.

## What Changes

- Improve markdown heading styles (h1-h6) with better typography, spacing, and visual distinction
- Style code blocks with syntax highlighting and proper backgrounds
- Create CSS variables for all customizable values (colors, spacing, typography)
- Extract theme-related variables to a central location for easy theming

## Capabilities

### New Capabilities
- `markdown-styling`: Enhanced visual styling for all markdown elements
- `css-theme-variables`: Centralized CSS variables for colors, fonts, and spacing enabling theme switching

### Modified Capabilities
- None (improves existing markdown display without changing functionality)

## Impact

- **Affected files**:
  - `web/src/styles/` or `web/src/` - Create/update markdown CSS variables
  - `web/src/pages/note/Markdown.jsx` - Apply new styles to markdown content