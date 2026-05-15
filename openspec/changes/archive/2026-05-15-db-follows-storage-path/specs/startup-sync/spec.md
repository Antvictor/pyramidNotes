## ADDED Requirements

### Requirement: Incremental sync on startup
The system SHALL perform bidirectional sync between markdown files and the database on every application startup.

#### Scenario: New file found
- **WHEN** a .md file exists in storagePath but has no corresponding record in DB
- **THEN** the system SHALL INSERT a new record with parsed frontmatter and content

#### Scenario: Orphan note found
- **WHEN** a note record exists in DB but corresponding .md file does not exist in storagePath
- **THEN** the system SHALL soft delete by moving the record to `deleted_notes` table

#### Scenario: Clean startup (no changes)
- **WHEN** all .md files have DB records and all DB records have corresponding files
- **THEN** the system SHALL proceed normally without modifications

### Requirement: Sync algorithm order
The system SHALL execute sync in this order:
1. Scan storagePath for all .md files
2. Query DB for all notes
3. Insert missing files as new notes
4. Soft delete orphaned DB records
5. Cleanup expired deleted_notes (< 15 days)

#### Scenario: Sync order
- **WHEN** startup sync runs
- **THEN** it SHALL complete steps 1-5 in order before the application becomes usable

### Requirement: Sync uses correct storagePath
The system SHALL use the configured `storagePath` (from cached settings) for all sync operations.

#### Scenario: User changed storagePath
- **WHEN** user changed storagePath in settings and restarted the app
- **THEN** the sync SHALL use the new storagePath location