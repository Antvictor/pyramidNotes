## 1. Add closeDatabase function to db.cjs

- [x] 1.1 Read `electron/db/db.cjs` current implementation
- [x] 1.2 Add `closeDatabase()` function that closes the DB connection
- [x] 1.3 Add `isInitialized` flag to track DB state

## 2. Add reload-db IPC handler in main.cjs

- [x] 2.1 Read `electron/main.cjs` current implementation
- [x] 2.2 Add handler that calls closeDatabase() then initializeDatabase(newPath) then initNode()
- [x] 2.3 Expose via preload to allow renderer to call it

## 3. Trigger backend reload when storagePath changes

- [x] 3.1 Read `electron/ipc/settings.cjs` current implementation
- [x] 3.2 After webContents.send, also call the reload-db handler

## 4. Test the flow

- [x] 4.1 Change storagePath in settings
- [x] 4.2 Verify DB is closed and reopened at new path
- [x] 4.3 Verify initNode runs and scans new directory
- [x] 4.4 Verify UI updates with new node list