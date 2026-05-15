## 1. Add settings change broadcast in settings.cjs

- [x] 1.1 Read `electron/ipc/settings.cjs` current implementation
- [x] 1.2 Add broadcast via `webContents.send` when storagePath changes

## 2. Expose settings change listener in preload.cjs

- [x] 2.1 Read `electron/preload.cjs` current exposed APIs
- [x] 2.2 Add `onSettingsChanged` callback exposure

## 3. Add reload listener in MindMap page

- [x] 3.1 Read `web/src/pages/MindMap.jsx`
- [x] 3.2 Add listener for settings-changed event to trigger node list reload

## 4. Test the flow

- [x] 4.1 Change storagePath in settings
- [x] 4.2 Verify new directory is scanned
- [x] 4.3 Verify UI updates with new node list