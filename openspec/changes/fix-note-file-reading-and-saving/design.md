## Context

The note page (`note/[id].tsx`) reads and saves markdown files. Three issues identified:
1. Filename construction may be wrong (should be `nodeId-nodeName.md`)
2. Content changes not being saved in real-time
3. Saved content has HTML artifacts instead of pure markdown

## Goals / Non-Goals

**Goals:**
- Fix filename format to match expected `id-name.md` pattern
- Ensure content saves properly with pure markdown
- Real-time save on content changes

**Non-Goals:**
- Don't change the file storage location or format

## Decisions

1. **Filename format**: Use `nodeId-nodeName.md` where nodeId and nodeName are extracted from the id parameter passed from MindMap page
2. **Raw markdown**: Ensure onChange receives the raw markdown string without any HTML conversion
3. **Save debouncing**: If real-time save is causing issues, we may need debounce - but first verify if it's actually saving at all