## Why

The current markdown editor uses CodeMirror 6 + Lezer, which provides a code-editor-like experience with separate preview. The Milkdown Crepe editor from the official website provides true WYSIWYG editing where users see formatted output as they type, with a cleaner fullscreen interface and no visible toolbar.

## What Changes

- **Remove** CodeMirror 6 + Lezer markdown editor implementation
- **Remove** All custom Milkdown/Crepe integration attempts in `src/core/editor/`
- **Add** Milkdown Crepe editor using official website implementation pattern
- **Add** Proper Crepe CSS styles matching official website
- **Add** Fullscreen layout with WYSIWYG editing

## Capabilities

### New Capabilities

- `crepe-editor`: Replace existing markdown editor with Milkdown Crepe WYSIWYG editor using the exact implementation pattern from milkdown.dev official website

### Modified Capabilities

- (none)

## Impact

- `src/core/editor/MarkdownEditor.tsx` - Replace with official Crepe implementation
- `src/core/editor/css/` - Add/replace with official Crepe styles
- Remove legacy CodeMirror/Lezer related code in editor directory