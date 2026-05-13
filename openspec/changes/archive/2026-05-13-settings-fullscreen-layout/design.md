## Context

The Settings page should fill the available screen space like the Markdown editor does. The Markdown editor uses `width: 90vw, height: 94vh` to fill most of the viewport. Settings currently uses fixed pixel padding that limits its size.

## Goals / Non-Goals

**Goals:**
- Settings page fills available height
- Settings content may be centered if content is narrower than available space
- Consistent with Markdown editor's approach to fullscreen layout

**Non-Goals:**
- Changing internal item layout (items stay left-aligned within the content)

## Decisions

### 1. Layout Approach

**Decision**: Use flexbox with full height and max-width for content.

**Rationale**: Markdown editor uses fixed viewport units but for a settings page, flexbox with centered max-width container is more flexible and adapts better to different content lengths.

### 2. Content Width Strategy

**Decision**: Use `max-width: 900px` for the content container, centered with auto margins.

**Rationale**: Settings content looks better with a readable line length. Centering with auto margins handles any leftover space elegantly.

## Risks / Trade-offs

- None significant - this is a straightforward layout fix

## Open Questions

None.