## ADDED Requirements

### Requirement: View deleted notes
The system SHALL provide a way for users to view their recently deleted notes that are still within the 15-day retention period.

#### Scenario: User requests deleted notes list
- **WHEN** user opens the deleted notes view
- **THEN** the system SHALL display all records from `deleted_notes` sorted by `deleted_at` descending

### Requirement: Restore deleted note
The system SHALL allow users to restore a soft-deleted note back to the notes table and filesystem.

#### Scenario: User restores a note
- **WHEN** user selects a note from deleted_notes and clicks restore
- **THEN** the system SHALL:
1. Write the note's content back to a new .md file with the original filename
2. Insert a new record into the notes table
3. Remove the record from `deleted_notes`

#### Scenario: Filename collision on restore
- **WHEN** user restores a note but a file with the same name already exists
- **THEN** the system SHALL append a timestamp to the filename to avoid collision

### Requirement: Permanent delete
The system SHALL allow users to permanently delete a note from `deleted_notes` before the 15-day automatic cleanup.

#### Scenario: User permanently deletes
- **WHEN** user selects a note from deleted_notes and clicks delete permanently
- **THEN** the system SHALL remove the record from `deleted_notes` without creating any file

### Requirement: Deleted note metadata display
The system SHALL show the following information for each deleted note:
- Original filename
- Date/time when deleted
- Preview of content (first 100 characters)
- Time remaining before auto-purge