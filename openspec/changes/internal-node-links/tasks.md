## 1. OpenSpec

- [x] 1.1 Add initial OpenSpec proposal, design, spec, and tasks for internal node links.
- [x] 1.2 Update proposal, design, spec, and tasks with extraction edge cases, WYSIWYG embeds, completion dismissal, and single-path Escape behavior.

## Current Status

- All implemented features except extraction are behaving as expected.
- `提取为子节点` had an implementation gap in the actual editor triggers: the child-node persistence path existed, but right-click and `Ctrl+Shift+M` were not reliably opening the extraction dialog from a TipTap selection.
- The editor trigger path has been repaired by preserving the latest non-empty TipTap selection, handling right-click before the browser/ProseMirror selection can be cleared, and capturing `Ctrl+Shift+M` at the editor wrapper as well as the ProseMirror handler.
- Extraction persistence helpers have focused unit coverage for name sanitization and parent linkage. Duplicate names are now preserved because node IDs keep files distinct.
- Remaining work is manual verification that right-click extraction, shortcut extraction, cancel, submit, child creation, and parent replacement all work in the running app.

## 2. Editor Syntax

- [x] 2.1 Add TipTap nodes for `[[Name]]` and `![[Name]]` parsing.
- [x] 2.2 Serialize internal links and embeds back to plain Markdown syntax.
- [x] 2.3 Verify whether the installed TipTap version has an official wiki-link/internal-link or transclusion extension, and use it if compatible.
- [x] 2.4 If no official extension exists, keep the local implementation within TipTap extension APIs rather than DOM post-processing.
- [x] 2.5 Keep the existing `tiptap-markdown` pipeline unless a compatibility check proves a Markdown integration migration is safe.
- [x] 2.6 Add focused tests or verification cases for parse and serialize round trips.

## 3. Extraction

- [x] 3.1 Add extraction command for the default `Ctrl+Shift+M` shortcut.
- [x] 3.2 Add right-click extraction action for non-empty selections.
- [x] 3.3 Create extracted content as a child node using the requested name and a unique node ID.
- [x] 3.4 Replace the browser prompt with the app's existing dialog/prompt pattern.
- [x] 3.5 Ensure the extraction shortcut is represented in the shortcut configuration with `Ctrl+Shift+M` as the default.

## 4. Navigation

- [x] 4.1 Add internal-link navigation by node name.
- [x] 4.2 Record internal-link navigation state so Escape can return to the previous note.
- [x] 4.3 Remove or gate duplicate note-page Escape handlers so exactly one navigation action runs.
- [x] 4.4 Preserve direct note Escape behavior that returns to the mind map.

## 5. Embeds

- [x] 5.1 Render `![[Name]]` as a non-editable block node.
- [x] 5.2 Render embedded content as read-only Markdown/WYSIWYG content rather than raw Markdown text.
- [x] 5.3 Show a non-editable missing-node placeholder for unresolved embeds.
- [x] 5.4 Add recursive embed cycle protection with a non-editable cycle placeholder.

## 6. Completion

- [x] 6.1 Show node suggestions after typing `[[` or `![[`.
- [x] 6.2 Complete the selected node into the correct link or embed syntax.
- [x] 6.3 Verify whether TipTap Suggestion is available in project dependencies before using it.
- [x] 6.4 Rework node-name completion onto TipTap Suggestion or a TipTap-owned ProseMirror plugin lifecycle.
- [x] 6.5 Support keyboard selection and dismissal without triggering note navigation.
- [x] 6.6 Normalize manually typed `[[Name]]` and `![[Name]]` tokens into internal nodes.
- [x] 6.7 Render internal links as atom node names without visible brackets.
- [x] 6.8 Restore incomplete source syntax when deleting an internal link.
- [x] 6.9 Confirm the active completion item with Enter or Tab and serialize closing `]]`.

## 7. Verification

- [x] 7.1 Run lint and fix regressions in touched files.
- [x] 7.2 Run build or targeted tests for the web app.
- [ ] 7.3 Manually verify extraction, link navigation, embed rendering, completion, and Escape behavior.
