## Context

When a user changes the storage path in settings, the new path is saved but never validated. When file operations (saveFile, etc.) use this path, they fail if:
1. The directory doesn't exist
2. The application lacks write permissions

The codebase already has `validateStoragePath()` in `electron/common/utils/fileHelper.js` but it's never called.

## Goals / Non-Goals

**Goals:**
- Ensure storage path exists before any file operation
- Auto-create directory with `recursive: true` if missing
- Provide user feedback when path is invalid or inaccessible

**Non-Goals:**
- Re-architect the settings persistence mechanism
- Add path permission checking beyond existence validation
- Handle symbolic links or junction points specially

## Decisions

1. **Where to add validation**: Modify `resolveStoragePath()` in `fileHelper.js` to ensure directory exists before returning
   - Rationale: Centralizes path resolution logic; all file operations call this function

2. **Auto-create vs. error**: Create directory automatically with `recursive: true`
   - Rationale: Matches behavior of DB initialization (`initNode.js`); least surprise to users

3. **Use existing `validateStoragePath`**: Call the existing function for validation, extend if needed
   - Rationale: Reuses existing code; the function already checks existence and directory type

## Risks / Trade-offs

- [Risk] Race condition if multiple processes try to create directory simultaneously → Mitigation: `recursive: true` handles this gracefully
- [Trade-off] Silently creating directories may mask permission issues → Acceptable since write will still fail if permissions missing, and user will see error

## Migration Plan

1. Update `fileHelper.js` `resolveStoragePath()` to ensure directory exists
2. Update `file.cjs` to catch and surface errors from file operations
3. No data migration needed; no breaking changes

## Open Questions

- Should validation happen at settings-save time or at file-operation time? (Chose file-operation time for immediate feedback)
- Do we need to notify renderer of path validation failure? (Yes, via IPC error response)