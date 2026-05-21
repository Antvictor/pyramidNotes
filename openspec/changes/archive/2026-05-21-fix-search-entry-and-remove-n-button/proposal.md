## Why

The search functionality (`node-search.tsx`) exists but has no UI entry point - users have no way to open the search dialog. Additionally, the original milkdown-website template included a floating "N button" that PyramidNotes doesn't need.

## What Changes

1. **Add search entry to Header**: Add a search icon button in the Header component that opens the `NodeSearchDialog` when clicked
2. **Remove floating N button**: Ensure no unused floating notification button exists in the codebase

## Capabilities

### New Capabilities
- `search-entry`: Add search icon to Header that triggers `NodeSearchDialog` with keyboard shortcut (Cmd/Ctrl+K) support

### Modified Capabilities
- (none)

## Impact

- **Modified**: `web/src/components/header/index.tsx` - add search button
- **Affected**: Search UX - users can now search nodes and full-text content via header icon or keyboard shortcut