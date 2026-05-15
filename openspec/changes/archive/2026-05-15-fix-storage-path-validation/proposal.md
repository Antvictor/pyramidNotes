## Why

When users configure a custom storage path in settings, file save operations fail silently because the configured directory may not exist or the application lacks write permissions. The `resolveStoragePath()` function returns the configured path without any validation, and no directory creation happens when a new path is saved.

## What Changes

- Add directory existence validation before file operations
- Auto-create the storage directory if it doesn't exist (with `recursive: true`)
- Add proper error handling with user feedback when path is invalid
- Leverage the existing but unused `validateStoragePath` function in `fileHelper.js`

## Capabilities

### New Capabilities
- `storage-path-validation`: Validates storage path existence and permissions before file operations; creates directory if missing

### Modified Capabilities
- None

## Impact

- **Affected files**:
  - `electron/ipc/file.cjs` - Add path validation before saveFile operation
  - `electron/common/utils/fileHelper.js` - Call existing `validateStoragePath` or add validation logic
  - `electron/common/settings.cjs` - Consider validation when saving new storage path