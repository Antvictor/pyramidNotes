## 1. MarkdownEditor Component

- [x] 1.1 Update MarkdownEditor.tsx with official Crepe pattern (useLayoutEffect + loadingRef)
- [x] 1.2 Add editorViewOptionsCtx configuration for class and spellcheck
- [x] 1.3 Configure listener for markdownUpdated callback
- [x] 1.4 Test editor initializes without double-creation

## 2. CSS Styling

- [x] 2.1 Update crepe-editor.css with official CSS variables (light mode)
- [x] 2.2 Add dark mode CSS variables for .dark .crepe .milkdown
- [x] 2.3 Apply fullscreen flexbox layout
- [x] 2.4 Set ProseMirror padding for comfortable editing

## 3. Cleanup Legacy Code

- [ ] 3.1 Remove old CodeMirror 6 / Lezer editor files if present
- [ ] 3.2 Remove old milkdown integration attempts (if any separate from current)
- [x] 3.3 Verify all imports resolve correctly

## 4. Testing

- [ ] 4.1 Test WYSIWYG editing (typing markdown shows formatted output)
- [ ] 4.2 Test onChange callback fires on content change
- [ ] 4.3 Test fullscreen layout displays correctly
- [ ] 4.4 Verify no double-editor creation in StrictMode