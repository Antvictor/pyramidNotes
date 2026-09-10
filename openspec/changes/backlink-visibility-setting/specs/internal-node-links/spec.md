## MODIFIED Requirements

### Requirement: Backlink panel

The note page SHALL show a panel at the bottom listing the notes that reference the current note, so the user can discover and navigate inbound references. The panel's visibility SHALL be controlled by the `showBacklinks` setting (default: show).

#### Scenario: Show backlinks

- **GIVEN** the current note is referenced by other notes
- **AND** the `showBacklinks` setting is show
- **WHEN** the user opens the current note
- **THEN** a panel at the bottom lists the referencing notes by name

#### Scenario: Hide the backlink panel

- **GIVEN** the user sets 反链面板 to 隐藏 in settings
- **WHEN** the user opens any note
- **THEN** the backlink panel is not rendered

#### Scenario: Setting persists across restart

- **GIVEN** the user has chosen 隐藏
- **WHEN** the app restarts
- **THEN** the panel remains hidden

#### Scenario: Default shows the panel

- **GIVEN** settings.json contains no `showBacklinks` key
- **WHEN** the app loads settings
- **THEN** the panel is shown (default `true`)

#### Scenario: Navigate from a backlink

- **GIVEN** the backlink panel lists a referencing note
- **WHEN** the user clicks that entry
- **THEN** the app opens the referencing note
- **AND** the cursor is placed right after the reference to the current note and scrolled into view

#### Scenario: No backlinks

- **GIVEN** no note references the current note
- **AND** the `showBacklinks` setting is show
- **WHEN** the user opens the current note
- **THEN** the backlink panel is not rendered
