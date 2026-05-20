## ADDED Requirements

### Requirement: Unified CSS variable-based markdown styling

All markdown styling in `web/src/core/editor/css/markdown.css` SHALL use CSS variables from `variables.css` instead of hardcoded values.

#### Scenario: Heading sizes use CSS variables
- **WHEN** markdown heading styles are rendered in the editor
- **THEN** font sizes SHALL be defined via `--font-size-h1` through `--font-size-h6` CSS variables

#### Scenario: Heading weights use CSS variables
- **WHEN** markdown heading styles are rendered in the editor
- **THEN** font weights SHALL be defined via `--font-weight-h1` through `--font-weight-h6` CSS variables

#### Scenario: Text colors use CSS variables
- **WHEN** markdown text is rendered in the editor
- **THEN** text color SHALL be defined via `--color-heading` CSS variable

#### Scenario: Code backgrounds use CSS variables
- **WHEN** inline code is rendered in the editor
- **THEN** background color SHALL be defined via `--color-code-bg` CSS variable

### Requirement: No !important overrides in markdown CSS

The `web/src/core/editor/css/markdown.css` file SHALL NOT contain any `!important` declarations for heading styles.

#### Scenario: CSS specificity is managed without !important
- **WHEN** markdown headings are rendered
- **THEN** CSS variables provide the styling hierarchy without needing `!important` overrides