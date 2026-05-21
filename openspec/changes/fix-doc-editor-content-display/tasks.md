## 1. Fix DocEditor Content Loading

- [x] 1.1 Add `contentRef` to track content without useEffect deps
- [x] 1.2 Add `mountedRef` to prevent state updates after unmount
- [x] 1.3 Fix useEffect to properly initialize editor only when content is ready
- [x] 1.4 Fix cleanup to properly destroy editor on unmount
- [x] 1.5 Test by opening a file and verifying content displays