# Internal Node Links and Extraction

## Why

Editing long node content currently has no first-class way to extract selected detail into a child node while keeping a readable reference in the original node. Reading also lacks navigable node references and inline read-only transclusion.

## What Changes

- Add an editor command and context-menu action that cuts the current selection into a newly created child node.
- Replace the extracted range with `[[节点ID|节点名称]]` in the original node.
- Render ID-backed `[[节点ID|节点名称]]` references as blue clickable internal node links while keeping legacy `[[节点名称]]` references readable.
- Render ID-backed `![[节点ID|节点名称]]` references as read-only embedded views while keeping legacy name-only embeds readable.
- Add node-name completion after typing `[[` or `![[`.
- Change Escape behavior from always returning to the mind map to returning to the previously visited node when navigation came from an internal link.
- Render embeds as a read-only rendered note preview rather than raw Markdown text.
- Keep the extraction shortcut compatible with the existing shortcut system while preserving `Ctrl+Shift+M` as the default.

## Capabilities

### New Capabilities

- `internal-node-links`: Covers extracting selections into child nodes, internal link syntax, read-only embeds, node-name completion, and link-aware note navigation.

### Modified Capabilities

- `open-prompt-replacement`: Extraction reuses the existing prompt/dialog pattern for naming the created child node.

## Impact

- Affected UI: TipTap note editor and note route navigation.
- Affected storage: Markdown files continue to store plain `[[...]]` and `![[...]]` syntax.
- Affected data: extraction creates a new `notes` row and a matching Markdown file with `top` set to the current node id.
- Affected shortcuts: note editing adds an extraction action with `Ctrl+Shift+M` default behavior.
