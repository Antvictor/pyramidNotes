## ADDED Requirements

### Requirement: Settings page displays three sections
The system SHALL display a settings page with three distinct sections: Basic Info, Common Operations, and Other.

### Requirement: Settings page is accessible
The system SHALL allow users to access the settings page by clicking a settings button in the main UI.

#### Scenario: Open settings page
- **WHEN** user clicks the settings button in the main UI
- **THEN** the settings page is displayed

#### Scenario: Close settings page
- **WHEN** user clicks a close button or presses Escape key
- **THEN** the settings page is hidden and the main view is restored

### Requirement: Basic Info section contains theme and storage settings
The Basic Info section SHALL contain a theme mode selector and a storage location configurator.

### Requirement: Common Operations section is empty
The Common Operations section SHALL display an empty area for future operations.

### Requirement: Other section contains system info and preferences
The Other section SHALL display system version, auto-update toggle, help link, and language selector.
