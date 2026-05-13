## ADDED Requirements

### Requirement: Settings stored in JSON format
The system SHALL store all settings in a file named `settings.json` at the Electron app data directory.

### Requirement: Settings include theme mode
The settings file SHALL contain the user's theme mode preference (Light, Dark, or System).

### Requirement: Settings include storage path
The settings file SHALL contain the user's configured markdown file storage path.

### Requirement: Settings include auto-update preference
The settings file SHALL contain a boolean indicating whether auto-update is enabled.

### Requirement: Settings include language preference
The settings file SHALL contain the user's selected language code.

### Requirement: Invalid settings fallback to defaults
The system SHALL fall back to default settings if the settings.json file is missing, corrupted, or unreadable.

#### Scenario: Missing settings file
- **WHEN** the settings.json file does not exist
- **THEN** the system SHALL create a new settings.json with default values

#### Scenario: Corrupted settings file
- **WHEN** the settings.json file contains invalid JSON
- **THEN** the system SHALL log an error and use default settings
