## ADDED Requirements

### Requirement: Dark Mode Toggle Service
The system SHALL provide a ThemeService that allows switching between light and dark themes via a toggle interface.

#### Scenario: Toggle theme
- **WHEN** `ThemeService.toggle()` is called
- **THEN** the theme SHALL switch from light to dark, or from dark to light
- **AND** the `html` element SHALL have the `dark` class added or removed accordingly
- **AND** the theme preference SHALL be persisted to localStorage

#### Scenario: Set specific theme
- **WHEN** `ThemeService.setTheme(true)` is called with `isDark = true`
- **THEN** the theme SHALL be set to dark mode
- **AND** the `html` element SHALL have the `dark` class added
- **WHEN** `ThemeService.setTheme(false)` is called with `isDark = false`
- **THEN** the theme SHALL be set to light mode
- **AND** the `dark` class SHALL be removed from the `html` element

#### Scenario: Get current theme
- **WHEN** `ThemeService.getTheme()` is called
- **THEN** it SHALL return `true` if dark mode is active, `false` otherwise

#### Scenario: Theme persists across page reload
- **WHEN** user switches to dark mode
- **AND** the page is refreshed
- **THEN** dark mode SHALL remain active on page reload
- **AND** the `html` element SHALL have the `dark` class on initial render

### Requirement: CSS Variables for Theme Colors
The system SHALL use CSS custom properties (variables) for all theme-related colors to enable seamless theme switching.

#### Scenario: Light theme colors
- **WHEN** the `dark` class is NOT present on the `html` element
- **THEN** CSS variables SHALL resolve to light theme color values

#### Scenario: Dark theme colors
- **WHEN** the `dark` class IS present on the `html` element
- **THEN** CSS variables SHALL resolve to dark theme color values
