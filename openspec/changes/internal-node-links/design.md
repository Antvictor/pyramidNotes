## Context

The note editor uses TipTap plus `tiptap-markdown` to store note bodies as Markdown files. Node metadata and searchable content are mirrored in the `notes` table, and note pages are opened with React Router routes of the form `/note/:id/:name`.

## Goals / Non-Goals

**Goals:**

- Keep internal references as portable Markdown text: `[[Name]]` and `![[Name]]`.
- Make selection extraction create a real child node and replace the selection with an internal link.
- Make internal links navigable and make Escape return to the previous note when navigation came from an internal link.
- Render embeds as non-editable, WYSIWYG previews of the target note content.
- Support completion for both link and embed syntax without introducing a heavyweight picker UI.

**Non-Goals:**

- Backlink indexes, graph visualization of links, or automatic repair of broken links are out of scope.
- Editing transcluded content in place is out of scope.
- Supporting aliases, heading anchors, or block-level references inside `[[...]]` is out of scope.

## Decisions

### Markdown syntax

Internal links use Obsidian-style text syntax:

- `[[Name]]` is an inline internal link.
- `![[Name]]` is a block embed.

The editor parses these tokens into TipTap nodes and serializes them back to the same Markdown syntax. Files remain editable outside the app.

The implementation must stay inside TipTap's extension model. If TipTap ships an official `[[...]]`/wiki-link or transclusion extension compatible with the installed version, use and configure that extension first. If no official extension exists, implement local extensions with the same integration points TipTap expects:

- `Node.create` or `Mark.create` for schema integration.
- `parseHTML`, `renderHTML`, and `addAttributes` for HTML parsing/rendering.
- React NodeViews for clickable links and read-only embed UI.
- TipTap Markdown extension integration for token parsing and serialization.
- TipTap commands/input rules/plugins for editor behavior.

Avoid parsing rendered DOM after TipTap has rendered, mutating editor HTML outside transactions, or storing non-Markdown placeholder HTML in files. Those approaches can conflict with ProseMirror schema, undo/redo, selection mapping, copy/paste, and Markdown round trips.

The current app already uses `tiptap-markdown`; this change should keep that pipeline unless replacing it with TipTap's official Markdown APIs is proven compatible and low-risk. The internal link extension should adapt to the installed Markdown integration instead of forcing a broad Markdown migration.

### Extraction flow

When the editor has a non-empty selection:

- `Ctrl+Shift+M` starts extraction.
- Right-clicking the selection shows an extraction action.
- The user enters a node name.
- The app creates a child node under the current node.
- The selected Markdown is saved as the child node content.
- The original selection is replaced with `[[created name]]`.

If the requested name already exists, the app keeps the requested node name. Node identity and Markdown file uniqueness are provided by the generated node ID in the `ID-name.md` file name.

The naming prompt should use the app's existing dialog style where practical. `window.prompt` is acceptable only as an intermediate implementation and should be replaced before the feature is considered complete.

### Navigation

Clicking an internal link looks up the first node with the matching name and navigates to its note route. Navigation records that the source was another note. Escape then goes back one browser-history entry; direct note entry still returns to the mind map.

Escape handling must have one authoritative note-page path. Existing global shortcut hooks and route wrappers should not both compete to handle note-page Escape.

### Embeds

Embeds render as atom block nodes with `contentEditable=false`. The displayed content comes from the target node's Markdown content and should be rendered through the same read-only Markdown rendering pipeline as normal note content, not shown as raw Markdown in a `<pre>`.

Embed rendering must guard against recursive transclusion. If an embed chain repeats a node already in the current render stack, the renderer should stop expanding and show a read-only cycle placeholder instead of recursing indefinitely.

### Completion

Typing `[[` or `![[` opens a translucent suggestion list anchored near the cursor. The list filters all nodes by typed text, supports mouse selection, and should support keyboard selection before completion.

Completion should use TipTap's official Suggestion utility, or a ProseMirror plugin wired through a TipTap extension if the multi-character `[[` and `![[` triggers cannot be expressed cleanly through Suggestion. It should not be implemented as a global keydown plus ad hoc coordinate overlay unless that is retained only as a temporary bridge.

Before implementation, verify whether the project has the package needed for TipTap's Suggestion utility. If it is absent and installing it is not desirable, implement completion as a TipTap extension that owns its ProseMirror plugin and popup lifecycle.

## Risks / Trade-offs

- Duplicate node names can make link resolution ambiguous -> duplicate display names are allowed because node IDs keep records and files distinct; name-based links resolve deterministically to the first matching node until aliases or id-based references are introduced.
- Rendering embeds through TipTap recursively can be expensive or complex -> prefer a lightweight read-only Markdown renderer and avoid nested editable editors.
- Escape is already handled in multiple places -> centralize note-page Escape handling or explicitly gate lower-level handlers so one behavior wins.
- Name-based links can break after node rename -> link repair is out of scope for this change, but broken links should remain visible and non-destructive.
- Custom syntax can conflict with TipTap Markdown parsing if it is implemented outside extension APIs -> keep parsing, serialization, node views, and suggestions inside TipTap/ProseMirror extension boundaries.
- Replacing the existing Markdown library could destabilize unrelated Markdown behavior -> keep `tiptap-markdown` unless a targeted compatibility check proves migration is safe.
- Recursive embeds can freeze rendering -> track the current embed path and render a cycle placeholder when a repeated node is encountered.
