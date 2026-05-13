## ADDED Requirements

### Requirement: Settings page uses Lucide icons only
The system SHALL use only Lucide React icons in the Settings page.

#### Scenario: Replace Ant Design Icons with Lucide
- **WHEN** reviewing the Settings page
- **THEN** all icons SHALL be imported from 'lucide-react'
- **AND** no Ant Design Icons SHALL be used

### Requirement: No @ant-design/icons dependency
The system SHALL NOT import any icons from @ant-design/icons package.

### Requirement: Settings page uses custom components instead of antd
The system SHALL replace antd components (Radio, Switch, Select, Card) in Settings.jsx with custom styled alternatives.

#### Scenario: Theme mode selector uses custom button group
- **WHEN** user views the theme mode selector
- **THEN** it SHALL be implemented as a custom styled button group
- **AND** not use antd Radio components

#### Scenario: Auto-update uses custom toggle
- **WHEN** user views the auto-update toggle
- **THEN** it SHALL be implemented as a custom toggle switch
- **AND** not use antd Switch component

#### Scenario: Language selector uses custom dropdown
- **WHEN** user views the language selector
- **THEN** it SHALL be implemented as a custom styled select
- **AND** not use antd Select component

#### Scenario: Settings sections use Card-like styling
- **WHEN** user views the settings sections
- **THEN** they SHALL use styled divs with border and padding
- **AND** not use antd Card component