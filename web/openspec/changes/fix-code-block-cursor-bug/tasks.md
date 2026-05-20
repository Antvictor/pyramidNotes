## 1. Refactor wrapCodeBlocks to Use Document Lines

- [x] 1.1 Read `view.state.doc` to get line information
- [x] 1.2 Replace DOM query with doc line iteration
- [x] 1.3 Implement `findCodeBlockRanges(doc)` function that returns ranges
- [x] 1.4 Use two-pass approach: find ranges first, then apply classes

## 2. Update Code Block Application Logic

- [x] 2.1 Get DOM line elements with `querySelectorAll('.cm-line')`
- [x] 2.2 Map doc line numbers to DOM line elements by index
- [x] 2.3 Apply `in-code-block` class to all lines in each range
- [x] 2.4 Ensure ordered list lines are NOT wrapped in code block

## 3. Verify and Test

- [ ] 3.1 Test: `1. 1\n2. 2\n```\ncode\n``` - cursor on list line
- [ ] 3.2 Test: `1. 1\n2. 2\n```\ncode\n``` - cursor on code block
- [ ] 3.3 Test: Multiple code blocks with list between them
- [x] 3.4 Verify: Build passes