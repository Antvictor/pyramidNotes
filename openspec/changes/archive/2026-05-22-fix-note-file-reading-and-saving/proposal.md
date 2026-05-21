## Why

When opening a note file, there are issues:
1. File reading may use wrong filename format (should be `id-name.md`)
2. Content changes are not being saved to file in real-time
3. Saved markdown contains HTML artifacts (`\n<br>`) instead of pure markdown

## What Changes

1. **Fix filename handling in note page**: Ensure filename is correctly extracted from id in format `nodeId-nodeName.md`
2. **Fix save trigger**: The DocEditor onChange needs to properly trigger save, and save should use the raw markdown from Crepe, not processed content
3. **Ensure pure markdown saves**: The markdown from Crepe's `markdownUpdated` should be saved as-is without HTML artifacts

## Capabilities

### Modified Capabilities
- `note-page`: Fix file reading filename format
- `doc-editor`: Ensure onChange passes pure markdown, not HTML-converted content

## Impact

- **Modified**: `web/src/pages/note/[id].tsx` - fix filename handling
- **Modified**: `web/src/components/doc-editor/index.tsx` - ensure raw markdown is passed to onChange