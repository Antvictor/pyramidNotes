## ADDED Requirements

### Requirement: Settings page fills available screen space
The system SHALL display the Settings page to fill the available height of the content area.

#### Scenario: Settings fills viewport height
- **WHEN** user navigates to Settings page
- **THEN** the page SHALL use the full available height

### Requirement: Settings content is readable width
The system SHALL center settings content with a maximum width for readability.

#### Scenario: Content centered with max-width
- **WHEN** user views the Settings page
- **THEN** content SHALL be centered with a max-width of approximately 800-900px
- **AND** remaining space is distributed as margins