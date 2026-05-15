## Context

**Current state:**
- Database is hardcoded at `{userData}/data` (e.g., `~/Library/Application Support/pyramidNotes/data`)
- `storagePath` setting only controls markdown file location, not DB location
- `initNode()` runs BEFORE `loadSettings()`, so it always uses default path
- No sync mechanism between file system and database

**Constraints:**
- Must support Mac, Linux, Windows (cross-platform hidden file)
- Need to preserve existing data migration path
- User's storagePath can be changed at runtime

## Goals / Non-Goals

**Goals:**
- DB file at `storagePath/.data` (hidden file, same dir as markdown)
- Incremental sync on startup (not full scan)
- Soft delete with 15-day retention
- Cross-platform hidden attribute support

**Non-Goals:**
- Support for multiple simultaneous storage paths
- Real-time file watching (only on startup sync)
- Backup/restore functionality (users manage their own files)
- Migration tool from old DB location (breaking change, fresh start acceptable)

## Decisions

### 1. DB Path: `storagePath/.data` (file, not directory)
- Rationale: Single file, hidden by name prefix, no extra directory nesting
- Alternative considered: `.data/db` directory → rejected, unnecessary complexity

### 2. Initialization Order: loadSettings → initNode
- **Current order (broken):**
  ```
  initializeDatabase() → initNode() → loadSettings()
  ```
- **New order:**
  ```
  loadSettings() → initializeDatabase() → initNode()
  ```
- Rationale: `initNode` must know the correct `storagePath` before scanning
- `initializeDatabase()` now takes `storagePath` as parameter

### 3. Incremental Sync Algorithm (replaces full scan)
```
On startup:
 1. Scan all .md files in storagePath → build fileSet
 2. Query all filenames from DB → build dbSet
 3. Files in fileSet but not in dbSet → INSERT (new files)
 4. Notes in dbSet but not in fileSet → soft delete (move to deleted_notes)
 5. Cleanup deleted_notes where deleted_at < (now - 15 days)
```

### 4. Soft Delete Schema
```sql
CREATE TABLE deleted_notes (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    content TEXT,           -- full markdown content for recovery
    yaml_data TEXT,         -- frontmatter for metadata
    deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    original_path TEXT      -- relative path for reference
);
```

### 5. Recovery Flow
```
User requests recovery for note_id:
 1. Get record from deleted_notes
 2. Write filename + content back to storagePath as .md file
 3. Insert new record into notes table with same metadata
 4. Delete record from deleted_notes
```

### 6. Cross-Platform Hidden File
- Mac/Linux: `.data` prefix handles automatically (dotfiles hidden)
- Windows: Set file attribute to hidden using `fs.chmod(0o666)` or platform-specific approach

### 7. New Notes Table Added Fields
The `notes` table may need a `filepath` field to track which file corresponds to which DB record, enabling accurate sync.

## Risks / Trade-offs

- **[Risk] User deletes storage directory completely**
  → Mitigation: DB file gone, app recreates empty DB on next startup
  → User loses all metadata (favorites, tags) but can rescan from files

- **[Risk] Concurrent access to .data file**
  → Mitigation: SQLite handles this; electron-store uses same dir without issue
  → No change needed

- **[Trade-off] Breaking change for existing users**
  → Old DB at userData location is abandoned
  → Acceptable: users who want continuity can manually copy old DB to new location
  → Migration tool is non-goal

- **[Risk] .data filename collision**
  → Mitigation: `.` prefix + user controls path
  → Very unlikely to have existing `.data` file in their notes directory

## Migration Plan

1. First startup with new code:
   - Load settings to get storagePath
   - Create `.data` file at storagePath
   - Run incremental sync
   - Old DB at userData is ignored

2. No automatic migration of old data
   - Users who need old favorites/tags must manually copy DB or recreate

3. Rollback: Revert to old code, DB still at userData (not touched)

## Open Questions

- Should we create `.data` directory if storagePath doesn't exist yet? (Same as markdown file handling - create on demand)
- Do we need to handle the case where user changes storagePath AFTER app is running? (Reload on setting change?)
- Should deleted_notes cleanup run on every startup or lazily?