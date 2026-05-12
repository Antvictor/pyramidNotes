## ADDED Requirements

### Requirement: Openspec Config Context
The openspec config.yaml SHALL provide project context information that helps AI understand the project background when generating artifacts.

#### Scenario: Tech stack context
- **WHEN** AI generates artifacts for a change
- **THEN** AI SHALL have access to tech stack information (TypeScript, React, Tailwind CSS, Electron)
- **AND** AI SHALL understand the project uses pnpm workspace structure

#### Scenario: Domain context
- **WHEN** AI generates specs for a new capability
- **THEN** AI SHALL know this is a notes application (pyramidNotes)
- **AND** AI SHALL understand the project follows conventional commits

### Requirement: Per-Artifact Rules
The openspec config.yaml SHALL provide per-artifact rules that guide AI when creating specific artifact types.

#### Scenario: Proposal rules
- **WHEN** AI creates a proposal artifact
- **THEN** AI SHALL keep proposals under 500 words
- **AND** AI SHALL include a Non-goals section

#### Scenario: Design rules
- **WHEN** AI creates a design artifact
- **THEN** AI SHALL include Goals/Non-Goals, Risks, and Open Questions sections

#### Scenario: Tasks rules
- **WHEN** AI creates a tasks artifact
- **THEN** AI SHALL break tasks into chunks of max 2 hours

#### Scenario: Specs rules
- **WHEN** AI creates a specs artifact
- **THEN** AI SHALL use 4层级标题 (####) for scenarios
- **AND** AI SHALL use SHALL/MUST for normative requirements
