## ADDED Requirements

### Requirement: Markdown heading styles in editor preview

The editor preview SHALL display markdown headings with proper size hierarchy.

#### Scenario: Heading sizes are distinct from body text
- **WHEN** user types `# Heading 1` in the editor
- **THEN** the preview displays text at 2em font size

#### Scenario: Heading hierarchy is maintained
- **WHEN** user types `## Heading 2` in the editor
- **THEN** the preview displays text at 1.5em font size

#### Scenario: Sub-heading displays smaller than parent heading
- **WHEN** user types `### Heading 3` in the editor
- **THEN** the preview displays text at 1.25em font size