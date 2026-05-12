## ADDED Requirements

### Requirement: Capabilities Overview Document
The openspec SHALL provide a capabilities.md file at the root that lists all known capabilities of the project.

#### Scenario: View all capabilities
- **WHEN** someone reads openspec/capabilities.md
- **THEN** they SHALL see a table of all capabilities
- **AND** each capability SHALL show its status (implemented/planned)
- **AND** each capability SHALL link to its relevant spec file or change

#### Scenario: New capability added
- **WHEN** a new capability is implemented via an openspec change
- **THEN** the capabilities.md SHALL be updated to include the new capability
- **AND** the capability SHALL be marked with its appropriate status
