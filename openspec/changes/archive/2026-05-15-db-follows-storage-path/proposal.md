## Why

Currently the database file is hardcoded at Electron's `userData/data` path, independent of the user's configured `storagePath`. This causes data inconsistency: markdown files and database live in different locations with no synchronization. When users change `storagePath`, existing data in DB is not re-scanned and new files at the new path are not loaded.

## What Changes

- Database file moves to `storagePath/.data` (hidden file, same directory as markdown files)
- **BREAKING**: Old database at `userData/data` is no longer used
- **BREAKING**: App initialization order changes - settings must load before node initialization
- Startup validation: bidirectional sync between files and DB
- Soft delete: when markdown file is deleted, its record moves to `deleted_notes` table (not hard delete)
- Auto cleanup: `deleted_notes` records older than 15 days are permanently purged
- Cross-platform hidden file support for `.data`

## Capabilities

### New Capabilities
- `db-storage-path`: Database file location follows user's `storagePath` configuration
- `soft-delete`: Deleted markdown files are preserved in `deleted_notes` table for 15 days
- `startup-sync`: App validates and syncs file system with database on every startup
- `deleted-notes-recovery`: Users can view and restore previously deleted notes

### Modified Capabilities
- `node-initialization`: Must run after settings are loaded to use correct `storagePath`

## Impact

- **Affected files**:
  - `electron/db/db.cjs` - DB path construction changes from hardcoded to `storagePath/.data`
  - `electron/main.cjs` - Initialization order: loadSettings before initNode
  - `electron/common/utils/fileHelper.js` - Already updated for path validation
  - `electron/node/initNode.js` - Rewrite to use incremental sync instead of full scan
  - `electron/common/settings.cjs` - May need `.data` directory creation on save