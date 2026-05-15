## Context

Currently when user changes `storagePath`:
1. Settings are saved to file ✓
2. `cachedSettings` is updated in memory ✓
3. **BUT** no IPC event is sent
4. Renderer doesn't know about the change
5. `initNode()` never re-runs

## Goals / Non-Goals

**Goals:**
- Notify renderer when storagePath changes
- Re-initialize database at new location
- Re-scan new storage path for nodes

**Non-Goals:**
- Don't reload entire app (window shouldn't close)
- Don't support arbitrary setting changes, only storagePath matters for reload

## Decisions

1. **Broadcast via IPC `settings-changed` event**: Simple event with new storagePath
2. **Re-init DB before initNode**: Need to close old DB, open new one
3. **Renderer reloads node list**: On event, call API to get updated nodes

## Risks / Trade-offs

- [Risk] DB re-init while renderer has open handles → Use proper close sequence
- [Risk] User has unsaved changes → Not handled (storagePath change is rare)

## Migration Plan

1. Add `ipcMain.emit` after saveSettings in settings.cjs
2. Add `onSettingsChanged` in preload.cjs
3. Add listener in Settings.jsx to trigger reload
4. Test the full flow