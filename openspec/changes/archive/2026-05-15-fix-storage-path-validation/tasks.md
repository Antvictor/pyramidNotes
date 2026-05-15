## 1. Update resolveStoragePath function

- [x] 1.1 Read current `resolveStoragePath()` implementation in `electron/common/utils/fileHelper.js`
- [x] 1.2 Modify `resolveStoragePath()` to check if directory exists
- [x] 1.3 Add directory creation with `recursive: true` if path doesn't exist
- [x] 1.4 Handle case where path is a file (fallback to default)

## 2. Update file.cjs error handling

- [x] 2.1 Read `electron/ipc/file.cjs` current implementation
- [x] 2.2 Wrap file operations in try-catch to capture errors
- [x] 2.3 Return descriptive error messages via IPC when operations fail

## 3. Verify and test

- [x] 3.1 Test saving file when storage path doesn't exist (should auto-create)
- [x] 3.2 Test saving file when storage path is invalid (should fallback)
- [x] 3.3 Verify no regressions on existing file operations