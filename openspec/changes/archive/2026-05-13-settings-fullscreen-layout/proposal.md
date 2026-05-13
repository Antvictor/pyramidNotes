## Why

The Settings page currently appears small and left-aligned because it uses fixed pixel widths and padding that don't adapt to the full available screen space. The goal is for Settings to fill the entire content area like the Markdown editor does.

## What Changes

- Update Settings page container to fill available height and width
- Remove fixed max-width constraints
- Use viewport-relative sizing similar to Markdown editor (which uses 90vw/94vh)
- Center content if content width is less than available space

## Non-goals

- Not changing the internal layout of settings items (labels left, controls right)
- Not changing other pages' layouts

## Capabilities

### New Capabilities

- `settings-fullscreen-layout`: Settings page fills available screen space

### Modified Capabilities

- None

## Impact

- Only affects `web/src/pages/settings/Settings.jsx`
- Content remains functional, only visual dimensions change