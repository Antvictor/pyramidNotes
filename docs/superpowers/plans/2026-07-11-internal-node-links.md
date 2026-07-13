# Internal Node Links and Extraction

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or equivalent task-by-task execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete `internal-node-links` so users can extract selected editor content into a child node, navigate `[[node]]` references, render `![[node]]` read-only embeds, complete node names in the editor, and use Escape to return to the prior linked note.

**Current Status:** All link, embed, navigation, completion, and Escape behaviors are implemented and working. Extraction into a child node (`提取为子节点`) has focused unit coverage for name sanitization and parent linkage, and its editor trigger path has been repaired after right-click/`Ctrl+Shift+M` were found not to reliably open the dialog. Duplicate requested names are preserved because node IDs keep records and files distinct. It still requires manual verification in the running app before task `7.3` can be marked complete.

**Architecture:** Keep the feature inside TipTap/ProseMirror extension boundaries. Preserve the existing `tiptap-markdown` pipeline unless a compatibility check proves a migration is safe. Use app-level node persistence in `Node.jsx`, TipTap extensions under `web/src/core/editor/extensions`, and a single note-page Escape handler in `App.jsx` or a shared shortcut path.

**Tech Stack:** React 19, React Router, TipTap 3, `tiptap-markdown`, SQLite via `db.notes`, Electron file APIs.

---

## File Structure

- `web/src/core/editor/extensions/InternalNodeLink.tsx` - Link/embed TipTap extensions, Markdown parse/serialize, node views.
- `web/src/core/editor/TipTapEditor.tsx` - Editor wiring, extraction command, completion UI/plugin, selection serialization.
- `web/src/pages/note/Node.jsx` - Node lookup, child creation, file/database persistence, link navigation.
- `web/src/App.jsx` and `web/src/hooks/useShortcuts.js` - Escape and shortcut routing.
- `web/src/pages/commons/OpenPrompt.jsx` or a new note-local dialog - Replace browser prompt for extraction naming.
- `web/src/index.css` or note-specific CSS - Link, embed, suggestion, and placeholder styling.
- `openspec/changes/internal-node-links/tasks.md` - Mark implementation progress.

---

## Task 1: Confirm TipTap Integration Path

**Files:**
- Read: `web/package.json`
- Read: `web/src/core/editor/extensions/InternalNodeLink.tsx`
- Modify only if needed: `web/package.json`, lockfile

- [ ] **Step 1: Check installed TipTap packages**

Inspect `web/package.json` and lockfiles for TipTap wiki-link, transclusion, Markdown, and Suggestion support.

- [ ] **Step 2: Decide implementation path**

Use this decision:
- If a compatible official TipTap wiki-link/transclusion extension exists in installed dependencies, configure it.
- If no compatible official extension exists, keep the local `Node.create` extensions and ensure they use TipTap schema, NodeView, Markdown parse/serialize, and ProseMirror plugin APIs.
- Do not replace `tiptap-markdown` unless a targeted compatibility check proves safe.

- [ ] **Step 3: Handle Suggestion dependency deliberately**

If completion will use TipTap Suggestion and the package/export is absent, add the package intentionally. If avoiding a new dependency, implement completion as a TipTap-owned ProseMirror plugin.

- [ ] **Verification**

Document the decision in code comments only if needed. Confirm no DOM post-processing or saved HTML placeholder strategy is introduced.

---

## Task 2: Harden Markdown Syntax Round Trips

**Files:**
- Modify: `web/src/core/editor/extensions/InternalNodeLink.tsx`
- Add tests if test harness is practical: `web/src/core/editor/extensions/InternalNodeLink.test.tsx` or equivalent

- [ ] **Step 1: Review current link/embed schemas**

Confirm `internalNodeLink` is inline/atom/selectable and `internalNodeEmbed` is block/atom/selectable with `contentEditable=false` NodeViews.

- [ ] **Step 2: Keep Markdown parser and serializer inside extension storage**

Ensure parsing of `[[Name]]` and `![[Name]]` happens through the Markdown integration and serializes back to exact plain Markdown syntax.

- [ ] **Step 3: Add edge-case coverage**

Verify these strings:
- `[[目标节点]]`
- `![[目标节点]]`
- adjacent links: `[[A]][[B]]`
- empty syntax: `[[]]` should remain plain text or be safely ignored
- missing closing brackets: `[[A` should remain editable text

- [ ] **Verification**

Run targeted tests if added, otherwise manually verify Markdown source after save still contains `[[...]]` and `![[...]]`.

---

## Task 3: Finish Extraction Flow

**Files:**
- Modify: `web/src/core/editor/TipTapEditor.tsx`
- Modify: `web/src/pages/note/Node.jsx`
- Modify/reuse: `web/src/pages/commons/OpenPrompt.jsx` or create a small extraction dialog

- [ ] **Step 1: Replace `window.prompt`**

Use the app's existing dialog style for node naming. The dialog must support submit, cancel, and empty-name validation.

- [ ] **Step 2: Preserve selection until submit**

Store the selected Markdown and range before opening the dialog. On cancel, leave the document unchanged. On submit, create the child node and replace the original range with the final `[[created name]]`.

- [ ] **Step 3: Keep child persistence atomic enough for UI**

In `Node.jsx`, create the `notes` row and Markdown file with `top` set to the current node id. Keep the requested node name after sanitization; the generated ID makes the `ID-name.md` file path unique.

- [ ] **Step 4: Represent extraction shortcut**

Either add extraction to note shortcut settings with default `Ctrl+Shift+M`, or document it as a fixed note-editor shortcut in the help/shortcut UI.

- [ ] **Verification**

Select content, trigger extraction by `Ctrl+Shift+M`, cancel, and verify no data changes. Repeat submit and verify child node, child file, parent replacement, and requested display name.

**Latest implementation note:** The extraction persistence path was present, but the feature was not truly complete because editor triggers were unreliable. `TipTapEditor.tsx` now stores the latest non-empty selection draft, uses stored selection for right-click after selection loss, captures context menu at the wrapper level, and captures `Ctrl+Shift+M` at the wrapper level as a fallback to ProseMirror `handleKeyDown`.

---

## Task 4: Centralize Note Escape Behavior

**Files:**
- Modify: `web/src/App.jsx`
- Modify if used: `web/src/hooks/useShortcuts.js`
- Inspect: `web/src/core/editor/TipTapEditor.tsx`

- [ ] **Step 1: Pick one note-page Escape owner**

Use `NodeWrapper` or the shared shortcut hook, but not both. The selected path must handle:
- suggestion popup open -> close suggestion only
- note opened through internal link -> `navigate(-1)`
- direct note open -> `navigate('/')`

- [ ] **Step 2: Stop competing handlers**

Remove or gate note-page Escape behavior from any other global shortcut path. Ensure editor-level suggestion Escape stops propagation or otherwise prevents navigation.

- [ ] **Step 3: Preserve search behavior**

If global search is open, Escape should close search before note navigation.

- [ ] **Verification**

Open node A from map, press Escape -> map. Open node B via `[[B]]` from A, press Escape -> A. Open suggestions, press Escape -> suggestions close and route does not change.

---

## Task 5: Render Links and Broken Links Correctly

**Files:**
- Modify: `web/src/core/editor/extensions/InternalNodeLink.tsx`
- Modify: `web/src/pages/note/Node.jsx`
- Modify styles: `web/src/index.css`

- [ ] **Step 1: Resolve targets by name deterministically**

Use current `allNodes` lookup. Missing links remain visible and do not navigate. Duplicate existing names resolve to the first deterministic match until id-based links are introduced.

- [ ] **Step 2: Style links as blue clickable internal links**

Keep enough contrast and clear hover/focus behavior. Broken links should look distinct but remain readable.

- [ ] **Step 3: Avoid accidental editing conflicts**

Clicking the atom link should navigate; selecting around it should still work for editing and deletion.

- [ ] **Verification**

Click existing link -> opens target. Click missing link -> stays on current note. Save/reopen -> source still stores `[[name]]`.

---

## Task 6: Implement Read-Only WYSIWYG Embeds

**Files:**
- Modify: `web/src/core/editor/extensions/InternalNodeLink.tsx`
- Add if needed: `web/src/core/editor/ReadOnlyMarkdown.tsx`
- Modify styles: `web/src/index.css`

- [ ] **Step 1: Replace raw `<pre>` rendering**

Render target Markdown through a read-only Markdown renderer using the same visual classes as note content. Do not create a nested editable editor.

- [ ] **Step 2: Add missing-node placeholder**

For unresolved embeds, show a non-editable placeholder that includes the target name and does not alter stored Markdown.

- [ ] **Step 3: Add cycle protection**

Track the current embed path. If a target appears twice in the render stack, stop expansion and show a non-editable cycle placeholder.

- [ ] **Step 4: Limit expensive rendering**

Avoid unbounded recursive rendering and avoid saving rendered embed content into the parent note.

- [ ] **Verification**

Verify `![[B]]` displays rendered Markdown, cannot be edited in place, stores as `![[B]]`, missing embeds show placeholder, and A/B recursive embeds do not freeze the UI.

---

## Task 7: Move Completion Into Editor Plugin Lifecycle

**Files:**
- Modify: `web/src/core/editor/TipTapEditor.tsx`
- Add or modify extension file if completion moves there: `web/src/core/editor/extensions/InternalNodeLink.tsx`
- Modify styles: `web/src/index.css`

- [ ] **Step 1: Replace ad hoc completion if possible**

Use TipTap Suggestion for node-name completion, or implement a TipTap extension-owned ProseMirror plugin for multi-character `[[` and `![[` triggers.

- [ ] **Step 2: Preserve requested visual style**

The popup should remain a translucent list of options without a visible input box.

- [ ] **Step 3: Support keyboard and mouse**

Support ArrowUp, ArrowDown, Enter/Tab to select, Escape to dismiss, and mouse selection.

- [ ] **Step 4: Insert correct node type**

Selecting after `[[` inserts an internal link. Selecting after `![[` inserts an embed. Undo should restore the typed trigger text or previous editor state cleanly.

- [ ] **Verification**

Type `[[`, filter nodes, keyboard select -> link inserted. Type `![[`, select -> embed inserted. Escape closes popup without leaving note.

---

## Remaining Work

- [ ] Re-run manual verification for extraction: selected content -> right-click menu -> naming dialog -> cancel leaves content unchanged.
- [ ] Re-run manual verification for extraction: selected content -> `Ctrl+Shift+M` -> naming dialog -> submit creates child node and replaces the selected range with the final internal link.
- [ ] After extraction is confirmed in the running app, complete OpenSpec task `7.3`.

---

## Task 8: Verification and OpenSpec Progress

**Files:**
- Modify: `openspec/changes/internal-node-links/tasks.md`

- [ ] **Step 1: Run static checks**

Run from `web/`:
```bash
pnpm run lint
```

- [ ] **Step 2: Run build or targeted tests**

Run from `web/`:
```bash
pnpm run test
```

If full tests are unavailable, run targeted tests and document the gap.

- [ ] **Step 3: Manual verification pass**

Verify extraction, link navigation, broken links, WYSIWYG embeds, recursive embed protection, completion, and Escape behavior.

- [ ] **Step 4: Update OpenSpec tasks**

Mark completed checkboxes in `openspec/changes/internal-node-links/tasks.md` accurately.

---

## Acceptance Checklist

- [ ] `[[node]]` parses, renders as a blue link, navigates, and saves as Markdown.
- [ ] `![[node]]` parses, renders read-only WYSIWYG content, and saves as Markdown.
- [ ] Recursive embeds stop with a placeholder.
- [ ] Selection extraction creates a child node and replaces the selected range with the final link.
- [ ] Extraction cancel leaves the parent unchanged.
- [ ] Completion works for `[[` and `![[` with mouse and keyboard.
- [ ] Escape closes completion before route navigation.
- [ ] Escape from linked note returns to previous note; direct note Escape returns to map.
- [ ] No rendered DOM post-processing or saved HTML placeholder strategy is used.
- [ ] Lint/tests/build verification is completed or any gap is documented.
