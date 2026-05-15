## ADDED Requirements

### Requirement: Soft delete on file deletion
The system SHALL move deleted markdown files to the `deleted_notes` table instead of permanently removing the record when the underlying file is deleted or not found during sync.

#### Scenario: File not found during sync
- **WHEN** startup sync finds a note in DB but corresponding file does not exist in storagePath
- **THEN** the system SHALL move the note's data to `deleted_notes` table with timestamp

#### Scenario: File manually deleted by user
- **WHEN** user deletes a .md file from storagePath
- **THEN** on next startup sync, the system SHALL soft delete the record

#### Scenario: Soft delete preserves content
- **WHEN** a note is soft deleted
- **THEN** the system SHALL preserve the full content, yaml_data, and original filename for potential recovery

### Requirement: 15-day retention for deleted notes
The system SHALL automatically purge `deleted_notes` records older than 15 days on every startup.

#### Scenario: Cleanup old records
- **WHEN** the application starts
- **THEN** it SHALL DELETE all records from `deleted_notes` where `deleted_at` is more than 15 days before current time

### Requirement: Deleted notes data structure
The `deleted_notes` table SHALL contain:
- `id`: Primary key (same as original note's id)
- `filename`: Name of the original .md file
- `content`: Full markdown content
- `yaml_data`: Serialized frontmatter JSON
- `deleted_at`: Timestamp of deletion
- `original_path`: Relative path to original file (for reference)