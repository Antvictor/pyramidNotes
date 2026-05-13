## Why

Users need a centralized way to customize application behavior, including visual appearance and data storage preferences. Currently, these settings are either hardcoded or inaccessible, limiting user control over their experience.

## What Changes

- **New Settings Page**: Accessible via settings button, displays three sections: Basic Info, Common Operations, Other
- **Theme Switching**: Users can switch between Light/Dark/System modes with persistent preference storage
- **Data Storage Location**: Users can dynamically change where markdown files are stored on the local filesystem
- **Settings Persistence**: All preferences stored in a `settings.json` file for cross-session persistence
- **Other Settings**: Display system version, auto-update toggle, help link, language selection

## Non-goals

- Cloud sync or cross-device settings migration
- Advanced file management (copy/move files between locations)
- Localization (language selection UI only, not full i18n implementation)

## Capabilities

### New Capabilities

- `settings-page`: Settings page with three-section layout (Basic Info, Common Operations, Other)
- `theme-switching`: Theme mode switching with Light/Dark/System options and persistence
- `settings-persistence`: Settings stored in `settings.json` for cross-session persistence
- `storage-location`: Configurable markdown file storage path with directory picker

### Modified Capabilities

- None

## Impact

- **Frontend**: New settings page component in web/
- **Electron**: IPC handlers for file dialog and settings read/write
- **Storage**: Settings JSON file at app data location
- **Theme System**: Integration with existing theme implementation
