## Context

**Problem**: When storagePath changes, renderer now re-queries `db.notes.select()`, but the SQLite database connection still points to the OLD path. The `initializeDatabase()` runs only once at startup.

**Current initialization order (broken after settings change)**:
```
main.cjs: app.whenReady()
  → loadSettings()  // gets storagePath
  → initializeDatabase(storagePath)  // opens DB at path X
  → initNode()  // scans path X
  
Later: user changes storagePath to Y
  → settings.cjs: broadcasts 'settings-changed'
  → MindMap.jsx: calls db.notes.select()
  → IPC 'dbQuery' is sent to electron
  → electron queries DB at path X (not Y!)
```

**Root cause**: The DB connection is a module-level singleton that never gets updated.

## Goals / Non-Goals

**Goals:**
- Close existing DB connection
- Re-initialize DB at new storagePath
- Re-run initNode to scan new directory
- Notify renderer when complete

**Non-Goals:**
- Don't change the renderer query mechanism (db.notes.select() is fine)
- Don't add transaction support or complex state management

## Decisions

1. **Add closeDatabase() to db.cjs**: Allows proper cleanup before re-init
2. **Add 'reload-db' IPC handler in main.cjs**: Called when settings change
3. **Settings.cjs triggers backend reload**: When storagePath changes, also call reload handler

## Risks / Trade-offs

- [Risk] DB might be locked during close → Use proper close() call
- [Risk] User has unsaved changes → Not handled (storagePath change is rare operation)