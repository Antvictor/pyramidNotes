## ADDED Requirements

### Requirement: Default storage location
The system SHALL use `~/Documents/pyramidNotes` as the default markdown file storage location.

### Requirement: Storage location is configurable
The system SHALL allow users to change the markdown file storage location via the settings UI.

#### Scenario: Change storage location
- **WHEN** user clicks the storage location button
- **THEN** a directory picker dialog opens
- **WHEN** user selects a valid directory
- **THEN** the storage path is updated in settings.json

### Requirement: Storage path validation
The system SHALL validate that the configured storage path exists and is accessible before saving.

#### Scenario: Invalid storage path
- **WHEN** user enters or selects an invalid/inaccessible path
- **THEN** an error message is displayed and the path is not saved

### Requirement: File operations use configured path
The system SHALL use the configured storage path for all markdown file read and write operations.
