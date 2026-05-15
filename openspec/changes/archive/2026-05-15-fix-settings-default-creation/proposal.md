## Why

When the app first runs and `settings.json` doesn't exist, `loadSettings()` calls `saveSettings(DEFAULT_SETTINGS)` to create it. However, `saveSettings()` only writes the file - it doesn't ensure the parent directory exists. If the `userData` directory doesn't exist yet (which can happen on first launch), `saveSettings()` fails silently and the settings file is never created.

## What Changes

- `saveSettings()` in `settings.cjs` must ensure the parent directory exists before writing
- Consider using synchronous `fs.writeFileSync` with directory creation to guarantee file creation before any async issues

## Capabilities

### New Capabilities
- None (this is a bug fix, not a new capability)

### Modified Capabilities
- `settings-persistence`: Fix file creation to ensure directory exists before writing

## Impact

- **Affected files**:
  - `electron/common/settings.cjs` - `saveSettings()` needs directory creation before file write