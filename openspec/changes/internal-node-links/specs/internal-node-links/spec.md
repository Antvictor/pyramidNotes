# Internal Node Links Specification

## ADDED Requirements

### Requirement: TipTap-native syntax integration

Internal node link and embed syntax SHALL integrate through TipTap-compatible extensions and SHALL preserve TipTap editor invariants such as schema validation, undo/redo, selection behavior, copy/paste, and Markdown round trips.

#### Scenario: Use official extension when available

- **GIVEN** a compatible official TipTap extension supports the required internal link or embed syntax
- **WHEN** the feature is implemented
- **THEN** the app uses and configures that official extension instead of duplicating equivalent parser behavior

#### Scenario: Use custom TipTap extension when no official extension exists

- **GIVEN** no compatible official TipTap extension supports `[[节点名称]]` or `![[节点名称]]`
- **WHEN** the feature is implemented
- **THEN** the app implements the syntax as TipTap-compatible custom extensions
- **AND** parsing and serialization are handled through TipTap Markdown integration

#### Scenario: Preserve existing Markdown pipeline

- **GIVEN** the app already uses an installed TipTap Markdown integration
- **WHEN** internal node link syntax is implemented
- **THEN** the app integrates with the existing Markdown pipeline
- **AND** it does not replace the Markdown library unless compatibility is verified

#### Scenario: Avoid out-of-band DOM parsing

- **GIVEN** note content contains internal link syntax
- **WHEN** the editor renders or saves the note
- **THEN** the app does not mutate rendered DOM outside TipTap transactions
- **AND** the Markdown file does not contain generated HTML placeholders for internal links or embeds

### Requirement: Extract selection into child node

The editor SHALL allow the user to extract the current non-empty selection into a new child node of the current node.

#### Scenario: Extract with keyboard shortcut

- **GIVEN** the user is editing a node
- **AND** a non-empty content range is selected
- **WHEN** the user presses `Ctrl+Shift+M`
- **THEN** the app prompts for a node name
- **AND** creates a new child node containing the selected content
- **AND** replaces the selected range with `[[节点名称]]`

#### Scenario: Extract with context menu

- **GIVEN** the user is editing a node
- **AND** a non-empty content range is selected
- **WHEN** the user right-clicks the selection and chooses extraction
- **THEN** the same extraction flow is performed

#### Scenario: Extract with duplicate requested name

- **GIVEN** the user extracts a selection
- **AND** another node already uses the requested name
- **WHEN** the app creates the child node
- **THEN** the app keeps the requested node name
- **AND** stores the node in an ID-prefixed Markdown file
- **AND** replaces the selected range with `[[请求节点名称]]`

#### Scenario: Cancel extraction prompt

- **GIVEN** the user starts extraction with a non-empty selection
- **WHEN** the user cancels the node-name prompt or submits an empty name
- **THEN** the original selection remains unchanged
- **AND** no child node is created

### Requirement: Internal node links

The editor SHALL parse `[[节点名称]]` as a theme-colored clickable node name to the matching node, without displaying the surrounding brackets in the editor.

#### Scenario: Open linked node

- **GIVEN** note content contains `[[目标节点]]`
- **AND** a node named `目标节点` exists
- **WHEN** the user clicks the rendered link
- **THEN** the app opens that node's content page

#### Scenario: Normalize typed link syntax

- **GIVEN** the user is editing a note
- **WHEN** the user manually types `[[目标节点]]`
- **THEN** the editor converts the completed token into the internal link node
- **AND** the displayed node is clickable when a matching node exists

#### Scenario: Restore syntax when deleting link

- **GIVEN** the editor displays an internal link
- **WHEN** the user deletes the link from an adjacent cursor position
- **THEN** the editor replaces the rendered link with an incomplete source token such as `[[目标节点]`
- **AND** the user can continue typing or choose a completion candidate to rebuild the link

#### Scenario: Typing around link preserves target

- **GIVEN** the editor displays an internal link as `目标节点`
- **WHEN** the user types adjacent content or presses Enter nearby
- **THEN** the link target remains `目标节点`
- **AND** the typed content is inserted outside the link node

#### Scenario: Preserve link syntax in storage

- **GIVEN** note content contains an internal link
- **WHEN** the note is saved
- **THEN** the Markdown file stores the link as `[[目标节点]]`

#### Scenario: Broken link remains visible

- **GIVEN** note content contains `[[缺失节点]]`
- **AND** no node named `缺失节点` exists
- **WHEN** the editor renders the note
- **THEN** the link text remains visible
- **AND** clicking it does not navigate away from the current note

### Requirement: Internal node embeds

The editor SHALL parse `![[节点名称]]` as a read-only embedded display of the matching node content rendered in the same visual Markdown style as note content.

#### Scenario: Show embedded node content

- **GIVEN** note content contains `![[目标节点]]`
- **AND** a node named `目标节点` exists with content
- **WHEN** the editor renders the note
- **THEN** the embedded node content is visible
- **AND** the embedded content cannot be edited in place

#### Scenario: Normalize typed embed syntax

- **GIVEN** the user is editing a note
- **WHEN** the user manually types `![[目标节点]]`
- **THEN** the editor converts the completed token into the internal embed node
- **AND** the target node content is shown read-only when a matching node exists

#### Scenario: Preserve embed syntax in storage

- **GIVEN** note content contains an internal embed
- **WHEN** the note is saved
- **THEN** the Markdown file stores the embed as `![[目标节点]]`

#### Scenario: Missing embedded node

- **GIVEN** note content contains `![[缺失节点]]`
- **AND** no node named `缺失节点` exists
- **WHEN** the editor renders the note
- **THEN** the editor shows a non-editable missing-node placeholder
- **AND** the parent note content remains editable around the placeholder

#### Scenario: Recursive embed cycle

- **GIVEN** node A embeds node B
- **AND** node B embeds node A
- **WHEN** the editor renders either node
- **THEN** the app stops expanding the repeated node
- **AND** shows a non-editable cycle placeholder
- **AND** the editor remains responsive

### Requirement: Node completion

The editor SHALL show a translucent node-name suggestion list after the user types `[[` or `![[`.

#### Scenario: Complete internal node syntax

- **GIVEN** the user is editing a node
- **WHEN** the user types `[[` or `![[`
- **THEN** the app shows matching node names
- **WHEN** the user selects a node
- **THEN** the syntax is completed with that node name

#### Scenario: Completion writes final bracket syntax

- **GIVEN** the suggestion list is open after `[[` or `![[`
- **WHEN** the user chooses a node by mouse or keyboard
- **THEN** the editor inserts the matching internal link or embed node
- **AND** saving the note serializes the node as `[[节点名称]]` or `![[节点名称]]`

#### Scenario: Keyboard completion confirms active item

- **GIVEN** the suggestion list is open after `[[` or `![[`
- **WHEN** the user presses ArrowUp or ArrowDown
- **THEN** the active suggestion changes
- **WHEN** the user presses Enter or Tab
- **THEN** the active suggestion is inserted and serialized with closing `]]`

### Requirement: Extraction shortcut is configurable

The extraction action SHALL appear in the note shortcut settings with `Ctrl+Shift+M` as the default binding.

#### Scenario: Show extraction shortcut in settings

- **GIVEN** the user opens shortcut settings
- **WHEN** the user views note shortcuts
- **THEN** the extraction action is listed
- **AND** its default shortcut is `Ctrl+Shift+M`

#### Scenario: Dismiss completion

- **GIVEN** the node-name suggestion list is visible
- **WHEN** the user presses Escape
- **THEN** the suggestion list closes
- **AND** the user remains on the current note page

#### Scenario: Completion uses editor plugin lifecycle

- **GIVEN** node-name completion is implemented
- **WHEN** the user types, selects, dismisses, or undoes completion
- **THEN** the behavior participates in the TipTap or ProseMirror plugin lifecycle
- **AND** undo/redo and cursor position remain consistent

#### Scenario: Completion dependency is explicit

- **GIVEN** the implementation uses TipTap's Suggestion utility
- **WHEN** the feature is built
- **THEN** the required Suggestion package or export is present in the project dependencies
- **AND** missing dependencies are added deliberately rather than assumed

### Requirement: Escape returns to previous node

The note page SHALL return to the previously visited node when the current note was opened through an internal link.

#### Scenario: Back from linked node

- **GIVEN** the user opens node B by clicking a link inside node A
- **WHEN** the user presses Escape on node B
- **THEN** the app returns to node A

#### Scenario: Direct note entry returns to mind map

- **GIVEN** the user opens a note directly from the mind map
- **WHEN** the user presses Escape
- **THEN** the app returns to the mind map

#### Scenario: Escape handling is not duplicated

- **GIVEN** the user is on a note page
- **WHEN** the user presses Escape
- **THEN** exactly one navigation action is performed
