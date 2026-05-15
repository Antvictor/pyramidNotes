## Context

The `saveSettings()` function writes to `settingsPath` but doesn't ensure the parent directory (`userData`) exists before writing. On first app launch, if Electron's `userData` directory hasn't been created yet, the write fails.

## Goals / Non-Goals

**Goals:**
- Ensure `settings.json` is always created, even on first launch
- Fail gracefully with error logging if even directory creation fails

**Non-Goals:**
- Change the settings structure or defaults
- Add new settings fields

## Decisions

1. **Use synchronous directory creation**: `fs.mkdirSync` with `recursive: true` before the async write
2. **Keep async file write**: The async `fs.writeFile` is fine for settings - not a hot path

## Risks / Trade-offs

- Minimal risk - this is a simple path existence check before write

## Migration Plan

No migration needed - this only affects first-run behavior.