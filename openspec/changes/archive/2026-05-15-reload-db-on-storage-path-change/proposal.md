## Why

When `storagePath` is changed in settings, the renderer receives the event and re-queries `db.notes.select()`. However, the SQLite database connection is still open at the OLD path. The `initializeDatabase()` is only called once at startup, so even though settings are updated, the DB connection never switches to the new path.

## What Changes

- Add a handler to close and re-initialize the database at the new storagePath
- When `settings-changed` is received, close old DB, re-init at new path, run `initNode()` to re-scan
- After re-initialization completes, notify renderer to refresh

## Capabilities

### New Capabilities
- `db-reload-on-path-change`: Ability to close and reopen database at different storage path

### Modified Capabilities
- None

## Impact

- **Affected files**:
  - `electron/db/db.cjs` - Add `closeDatabase()` function and modify to support re-initialization
  - `electron/main.cjs` - Add IPC handler to reload DB when storagePath changes
  - `electron/ipc/settings.cjs` - Already sends event, needs to trigger backend reload as well