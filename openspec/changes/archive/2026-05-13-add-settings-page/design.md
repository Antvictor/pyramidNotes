## Context

pyramidNotes is a desktop notes application using Electron with a React frontend. Currently, theme and storage configurations are hardcoded or not persisted across sessions. Users need a centralized settings UI to configure application behavior.

## Goals / Non-Goals

**Goals:**
- Provide a settings page accessible from the main UI
- Support theme switching (Light/Dark/System) with persistent preference
- Allow dynamic configuration of markdown file storage location
- Persist all settings to a local `settings.json` file
- Display system information (version, auto-update status)

**Non-Goals:**
- Cloud sync or cross-device settings
- Full localization (i18n) framework
- File management operations (copy/move files)
- User authentication or multi-user support

## Decisions

### 1. Settings Storage Format: JSON

**Decision**: Store settings in `settings.json` at the Electron app data directory.

**Rationale**: JSON is readable, editable, and well-supported across Node.js and Electron APIs. YAML was considered but JSON has better ecosystem support in Electron context.

**Alternatives**:
- `settings.yaml`: More human-readable but requires additional dependency
- `electron-store`: Easier but adds a third-party dependency

### 2. Theme Implementation

**Decision**: Use CSS variables for theme colors, controlled by a `data-theme` attribute on the document root. Theme preference stored in `settings.json` and applied on app startup.

**Rationale**: CSS variables allow instant theme switching without page reload. `data-theme` approach is standard and works well with Tailwind.

**Alternatives**:
- Separate CSS files per theme: More complex to maintain
- CSS-in-JS: Overkill for this use case

### 3. Storage Location

**Decision**: Store the markdown file path in `settings.json`. Default to `~/Documents/pyramidNotes`. Use Electron's `dialog.showOpenDialog` for directory selection.

**Rationale**: Simple, predictable default location. User can relocate via settings UI.

**Alternatives**:
- Store files in app data directory: Less intuitive for users
- Relative paths: Can cause confusion with working directory

### 4. Settings Page Structure

**Decision**: Three-section layout as specified:
- **Basic Info**: Theme switcher, Storage location
- **Common Operations**: Empty (placeholder for future operations)
- **Other**: System version, Auto-update toggle, Help link, Language selector

**Rationale**: Follows user's explicit requirements. Clear categorization helps users find specific settings.

## Risks / Trade-offs

- **[Risk] Invalid storage path** → User may enter invalid directory path
  - **Mitigation**: Validate path exists before saving; show error if inaccessible
- **[Risk] Theme flash on startup** → Brief flash of wrong theme before settings load
  - **Mitigation**: Apply theme synchronously on app initialization before window renders
- **[Risk] Settings file corruption** → JSON parse error could crash app
  - **Mitigation**: Validate JSON on read; fallback to defaults if invalid

## Migration Plan

1. Create `settings.json` with defaults on first launch
2. Implement settings page UI in React
3. Add IPC handlers for settings read/write
4. Wire up existing theme code to read from settings
5. Update file location logic to use settings value
6. Test theme switching and path changes

## Open Questions

1. Should we validate the storage path in real-time or only on save?
2. What should the language selector contain - just the UI language or also note language?
3. Should "Common Operations" have any placeholder items for future features?
