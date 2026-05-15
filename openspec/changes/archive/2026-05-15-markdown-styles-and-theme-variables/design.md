## Context

Currently markdown content is displayed with minimal or no custom styling. Headings blend together, code blocks lack proper formatting, and there are no CSS variables for theming.

## Goals / Non-Goals

**Goals:**
- Create comprehensive CSS for markdown elements (headings, code, lists, blockquotes, tables)
- Define CSS custom properties (variables) for all theme-able values
- Ensure dark/light mode compatibility through CSS variable switching
- Make code blocks visually distinct with syntax highlighting colors

**Non-Goals:**
- Don't change markdown rendering logic (keep using existing parser)
- Don't implement full theme switching system yet (just the CSS variables foundation)

## Decisions

### 1. CSS Variable Structure

```css
:root {
  /* Typography */
  --font-family-base: system-ui, -apple-system, sans-serif;
  --font-family-mono: 'Fira Code', 'Consolas', monospace;
  --font-size-h1: 2em;
  --font-size-h2: 1.5em;
  --font-size-h3: 1.25em;
  /* ... etc */

  /* Colors - Light theme */
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #666666;
  --color-heading: #111111;
  --color-code-bg: #f5f5f5;
  --color-code-text: #1a1a1a;
  /* ... etc */

  /* Spacing */
  --spacing-heading: 1.5em;
  --spacing-paragraph: 1em;
  /* ... etc */
}

.dark {
  /* Override with dark theme values */
}
```

### 2. Markdown Element Styles

**Headings:**
- h1: Large, bold, bottom border, margin-top for spacing
- h2: Slightly smaller, with left accent border
- h3-h6: Progressive size reduction, maintain hierarchy

**Code blocks:**
- Background color distinct from content area
- Border radius for modern look
- Horizontal scroll for long lines
- Padding for readability

**Other elements:**
- Lists: proper indentation and spacing
- Blockquotes: left border accent + italic text
- Tables: borders, alternating row colors
- Links: color + underline on hover

## Risks / Trade-offs

- CSS variables may need adjustment as themes are actually implemented
- Code syntax highlighting colors are subjective - use neutral palette first