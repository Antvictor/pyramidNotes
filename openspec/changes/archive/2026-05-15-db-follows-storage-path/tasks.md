## 1. Modify initialization order

- [x] 1.1 Read current `electron/main.cjs` initialization order
- [x] 1.2 Reorder to: loadSettings → initializeDatabase → initNode
- [x] 1.3 Verify settings are cached before initNode runs

## 2. Update DB path construction

- [x] 2.1 Read current `electron/db/db.cjs` DB path logic
- [x] 2.2 Modify `initializeDatabase` to accept `storagePath` parameter
- [x] 2.3 Change DB path from `{userData}/data` to `{storagePath}/.data`
- [x] 2.4 Create `.data` file with hidden attribute if not exists

## 3. Create deleted_notes table

- [x] 3.1 Add `deleted_notes` table schema to DB initialization
- [x] 3.2 Schema: id, filename, content, yaml_data, deleted_at, original_path

## 4. Implement incremental sync

- [x] 4.1 Read current `electron/node/initNode.js` implementation
- [x] 4.2 Rewrite to use incremental sync algorithm:
  - Scan storagePath for .md files → fileSet
  - Query DB for all filenames → dbSet
  - Files in fileSet not in dbSet → INSERT
  - Notes in dbSet not in fileSet → soft delete to deleted_notes
- [x] 4.3 Add cleanup of deleted_notes older than 15 days

## 5. Update file.cjs soft delete

- [x] 5.1 Read `electron/ipc/file.cjs` deleteFile handler
- [x] 5.2 Modify deleteFile to soft delete (move to deleted_notes) instead of hard delete
- [x] 5.3 Ensure file is moved to trash (existing behavior) but record is preserved

## 6. Cross-platform hidden file support

- [x] 6.1 Check Mac/Linux: `.data` prefix should auto-hide
- [x] 6.2 For Windows: Add code to set hidden file attribute on `.data` file

## 7. Implement deleted notes recovery UI (if not exists)

- [ ] 7.1 Check if deleted notes view exists in frontend
- [ ] 7.2 If not, create UI to list deleted notes
- [ ] 7.3 Add restore functionality
- [ ] 7.4 Add permanent delete functionality

## 8. Test and verify

- [ ] 8.1 Test startup with empty storagePath (should create directory and .data)
- [ ] 8.2 Test adding new .md file (should appear in DB)
- [ ] 8.3 Test deleting .md file externally (should soft delete on next startup)
- [ ] 8.4 Test restoring from deleted_notes
- [ ] 8.5 Test 15-day cleanup (can mock time)
- [ ] 8.6 Verify hidden file on all platforms