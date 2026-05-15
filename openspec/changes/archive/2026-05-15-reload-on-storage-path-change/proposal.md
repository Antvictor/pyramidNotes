## Why

When user changes `storagePath` in Settings, the application does not notify the renderer or re-sync data. The `initNode()` function only runs at startup, so any subsequent storage path change leaves the UI showing stale data from the old path.

## What Changes

- When `saveSettings` detects a `storagePath` change, it broadcasts an IPC event to all windows
- Renderer (preload) receives the event and triggers a node list reload
- Database is re-initialized at the new storage path location
- `initNode()` is called to re-scan and sync the new storage path

## Capabilities

### New Capabilities
- `settings-change-notification`: System broadcasts storage path changes to renderer via IPC

### Modified Capabilities
- `node-initialization`: Must support re-initialization when storage path changes at runtime

## Impact

- **Affected files**:
  - `electron/ipc/settings.cjs` - Add broadcast when storagePath changes
  - `electron/preload.cjs` - Expose `onSettingsChanged` listener to renderer
  - `web/src/pages/settings/Settings.jsx` - Listen for settings change event and reload
  - `electron/main.cjs` - Re-initialize DB and run initNode when storagePath changes