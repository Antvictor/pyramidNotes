# Crepe Editor Spec

## Overview

Replace the existing markdown editor with Milkdown Crepe WYSIWYG editor, following the exact implementation from milkdown.dev official website.

## Requirements

### Component Interface

```typescript
interface MilkdownEditorProps {
    content: string      // Initial markdown content
    onChange: (v: string) => void  // Callback when content changes
}
```

### Behavior

- **WYSIWYG Editing**: User edits markdown and sees formatted output in real-time
- **Fullscreen Layout**: Editor takes full available height
- **No Toolbar**: Clean interface without visible toolbar buttons
- **No Double-Initialization**: Must prevent creating two editor instances (React StrictMode compatibility)

### Implementation Pattern

Follow exact pattern from `/tmp/milkdown-website/src/components/doc-editor/index.tsx`:

1. Use `useLayoutEffect` for editor lifecycle
2. Use `loadingRef` to prevent double initialization
3. Create `Crepe` instance with config
4. Use `crepe.editor.config()` to set options and listeners
5. Use `.use(listener)` to enable change callbacks
6. Call `crepe.create()` to initialize
7. Cleanup with `crepe.destroy()` in effect return

### CSS Requirements

- Import `@milkdown/theme-nord/style.css`
- Apply Crepe color CSS variables
- Full-height flexbox layout
- ProseMirror padding for comfortable editing

## Dependencies

- `@milkdown/crepe` - Crepe editor
- `@milkdown/plugin-listener` - For markdown change callbacks
- `@milkdown/kit` - For `editorViewOptionsCtx`
- `@milkdown/theme-nord` - Nord theme styles