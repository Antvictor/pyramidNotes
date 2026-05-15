## 1. Fix saveSettings directory creation

- [x] 1.1 Read `electron/common/settings.cjs` current saveSettings implementation
- [x] 1.2 Add `fs.mkdirSync` with `recursive: true` for parent directory before write
- [x] 1.3 Verify fix handles first-run scenario