## ADDED Requirements

### Requirement: Theme mode selection
The system SHALL allow users to select between three theme modes: Light, Dark, and System.

#### Scenario: Switch to Light mode
- **WHEN** user selects Light mode from the theme selector
- **THEN** the application theme changes to Light mode immediately

#### Scenario: Switch to Dark mode
- **WHEN** user selects Dark mode from the theme selector
- **THEN** the application theme changes to Dark mode immediately

#### Scenario: Switch to System mode
- **WHEN** user selects System mode from the theme selector
- **THEN** the application theme follows the operating system preference

### Requirement: Theme preference is persisted
The system SHALL persist the user's theme preference to settings.json and restore it on application restart.

#### Scenario: Theme preference persists across restart
- **WHEN** user changes theme to Dark mode and restarts the application
- **THEN** the application starts in Dark mode
