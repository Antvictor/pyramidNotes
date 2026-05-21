## Context

The DocEditor component uses `@milkdown/crepe` (Crepe editor). When content is loaded from a file and passed to DocEditor, the editor displays blank despite content existing.

## Goals / Non-Goals

**Goals:**
- Fix the editor so content is displayed correctly when file is opened
- Ensure content changes from file load are properly captured

**Non-Goals:**
- Don't change editor functionality, only fix the loading issue

## Decisions

1. **Use ref for content tracking**: The current approach passes `content` directly in useEffect deps, but content is only set after async file read. Use a `contentRef` to track content changes without causing re-render loops.
2. **Fix cleanup condition**: The cleanup checks `loading.current` before calling `destroy()`. If create() hasn't completed, destroy() is skipped, leaving orphaned state.
3. **Add mounted guard**: Use `mountedRef` to track if component is still mounted, preventing state updates after unmount.

## Risks / Trade-offs

- [Risk] Changing useEffect pattern might break other functionality → Test file open/save flow
- [Risk] Ref pattern may miss content updates → Use proper ref synchronization