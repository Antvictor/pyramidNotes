## Why

When opening a note file, the content is read successfully but the Crepe editor displays a blank page. The content is not being correctly parsed or passed to the editor.

## What Changes

1. **Fix DocEditor initialization**: The `useEffect` in DocEditor has a race condition where `loading.current` being set to `true` before `crepe.create()` completes causes the cleanup function to skip `crepe.destroy()`, potentially leaving the editor in a broken state
2. **Use ref pattern for content**: Instead of using `content` directly in useEffect deps (which causes re-init on every render), use a ref to track content and only initialize when content actually changes

## Capabilities

### New Capabilities
- (none - this is a bug fix)

### Modified Capabilities
- `doc-editor`: Fix content loading bug in DocEditor component

## Impact

- **Modified**: `web/src/components/doc-editor/index.tsx` - fix useEffect cleanup and content handling