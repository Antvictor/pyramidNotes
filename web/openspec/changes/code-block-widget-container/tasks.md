## 1. Implement Modulo-based Code Block Wrapper

- [x] 1.1 Create `codeBlockWrapper.ts` with modulo-based logic
- [x] 1.2 Implement `countFences(text: string): number` - count ``` in line
- [x] 1.3 Implement `wrapCodeBlocks(view)` using fenceCount tracking
- [x] 1.4 Implement `unwrapCodeBlocks(view)` to clean up wrappers
- [x] 1.5 Ensure first ``` starts wrapper, second ``` ends it

## 2. Integrate with markdownDecoration.ts

- [x] 2.1 Import and call wrapCodeBlocks after decorations applied
- [x] 2.2 Trigger on docChanged, selectionSet, viewportChanged
- [x] 2.3 Always unwrap before rewrap to prevent accumulation

## 3. Update CSS Styles

- [x] 3.1 Update wrapper styles for background/border
- [x] 3.2 Simplified (fence visibility handled by wrapper) - no :has() needed
- [x] 3.3 Ensure empty line (br) inherits wrapper background

## 4. Test and Verify

- [ ] 4.1 Test basic code block - wrapper applied correctly
- [ ] 4.2 Test code block with empty line - background extends
- [ ] 4.3 Test multiple code blocks - each wrapped independently
- [ ] 4.4 Test fence visibility when cursor on fence line
- [ ] 4.5 Test code block with other blocks inside (> quote, - list)
- [ ] 4.6 Test deleting one fence - code block style disappears
- [ ] 4.7 Verify cursor movement doesn't affect wrapper stability

## 5. Build and Archive

- [x] 5.1 Build and verify (passed)
- [ ] 5.2 Archive change