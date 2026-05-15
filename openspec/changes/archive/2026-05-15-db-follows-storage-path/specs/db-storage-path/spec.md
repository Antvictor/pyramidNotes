## ADDED Requirements

### Requirement: Database file location
The system SHALL store the SQLite database at `storagePath/.data` where `storagePath` is the user's configured notes directory.

#### Scenario: DB path uses storagePath
- **WHEN** the application needs to access the database
- **THEN** it SHALL use the path `storagePath/.data`

#### Scenario: Storage path is default
- **WHEN** user has not configured a custom storagePath
- **THEN** DB SHALL be at `defaultStoragePath/.data` which is `{Documents}/pyramidNotes/.data`

#### Scenario: Hidden file on Mac/Linux
- **WHEN** the system creates the `.data` file on Mac or Linux
- **THEN** the dot-prefix name SHALL make it hidden by default

#### Scenario: Hidden file on Windows
- **WHEN** the system creates the `.data` file on Windows
- **THEN** it SHALL set the file attribute to hidden using platform-specific methods

### Requirement: DB initialization with storagePath
The system SHALL initialize the database after settings are loaded so that the correct `storagePath` is available.

#### Scenario: Settings loaded before DB init
- **WHEN** the application starts
- **THEN** settings SHALL be loaded before database initialization begins

#### Scenario: DB created if not exists
- **WHEN** the application starts and `.data` does not exist at storagePath
- **THEN** it SHALL create the file and initialize the database schema