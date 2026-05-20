## 1. Add Debug Logging

- [x] 1.1 Add console.log in findCodeBlockRanges to log fenceCount at each line
- [x] 1.2 Add console.log in wrapCodeBlocks to log ranges found
- [x] 1.3 Add console.log to verify cmLines.length === doc.lines

## 2. Investigate DOM vs Doc Line Count

- [x] 2.1 Log cmLines.length and doc.lines on each wrapCodeBlocks call
- [x] 2.2 If they differ, investigate why (viewport, lazy rendering, etc) - verified consistent
- [x] 2.3 If consistent, verify range application is correct

## 3. Fix Fence Detection If Needed

- [x] 3.1 If bug found, fix the detection logic
- [x] 3.2 Ensure fenceCount is not reset incorrectly - FOUND BUG: reset was breaking multiple code blocks
- [x] 3.3 Ensure multiple code blocks are detected independently

## 4. Verify and Clean Up

- [x] 4.1 Test with ordered list before code block
- [x] 4.2 Test with unordered list before code block
- [x] 4.3 Test with blockquote before code block
- [x] 4.4 Remove debug logging after verification