## 1. Create CodeBlockWidget Class

- [ ] 1.1 Create `src/core/editor/core/plugins/codeBlock.ts`
- [ ] 1.2 Implement `CodeBlockWidget extends WidgetType`
- [ ] 1.3 Implement `toDOM()` method returning wrapper DOM
- [ ] 1.4 Implement `eq()` method for content comparison
- [ ] 1.5 Implement `coords` method for positioning

## 2. Update markdownDecoration.ts

- [ ] 2.1 Import CodeBlockWidget
- [ ] 2.2 Replace mark decoration with widget decoration for FencedCode
- [ ] 2.3 Remove old mark-based code block handling

## 3. Update CSS Styles

- [ ] 3.1 Simplify code-block/styles.css (remove fence mark classes)
- [ ] 3.2 Add `.md-code-block-wrapper` styles
- [ ] 3.3 Verify fence and content styling still works

## 4. Test and Verify

- [ ] 4.1 Test multi-line code block with empty line
- [ ] 4.2 Test single-line code block
- [ ] 4.3 Verify empty lines have correct background
- [ ] 4.4 Verify visual borders are continuous

## 5. Build and Archive

- [ ] 5.1 Build and verify
- [ ] 5.2 Archive change