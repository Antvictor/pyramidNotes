## Context

The search component (`NodeSearchDialog`) exists in `web/src/components/node-search.tsx` but has no UI trigger. Users cannot access search functionality.

## Goals / Non-Goals

**Goals:**
- Add search icon button to Header component
- Support Cmd/Ctrl+K keyboard shortcut to open search
- Integrate NodeSearchDialog for node name and full-text search

**Non-Goals:**
- Modify search algorithm or results display
- Change any other UI elements

## Decisions

1. **Search icon style**: Use a simple magnifying glass emoji (🔍) to match existing dark mode toggle pattern
2. **Keyboard shortcut**: Cmd/Ctrl+K is a standard convention (similar to VS Code, Notion, etc.)
3. **Dialog state**: Use local state in a wrapper component that manages open/close

## Risks / Trade-offs

- [Risk] Global keyboard shortcut may conflict with browser defaults → Only register when no input is focused
- [Risk] Search dialog styling may not match current design → Use existing Command component from UI library (already imported in node-search.tsx)