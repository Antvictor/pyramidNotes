## Context

The pyramidNotes app needs a markdown editor for note editing. The current implementation uses CodeMirror 6 + Lezer which shows markdown source with a separate preview. The official Milkdown website (milkdown.dev) demonstrates a superior WYSIWYG editing experience using Crepe.

The official implementation in `/tmp/milkdown-website/` shows the exact pattern to follow.

## Goals / Non-Goals

**Goals:**
- Implement WYSIWYG markdown editing using Milkdown Crepe
- Match the official milkdown.dev editor experience
- Fullscreen layout with no toolbar visible
- Proper lifecycle management to prevent double-initialization
- CSS styling matching the official implementation

**Non-Goals:**
- No additional plugins beyond listener (for onChange callback)
- No custom features beyond basic Crepe configuration
- Not using MilkdownProvider/useEditor hooks (direct Crepe instantiation as shown in official doc-editor)

## Decisions

1. **Direct Crepe instantiation over MilkdownProvider pattern**
   - The official doc-editor uses `new Crepe()` directly with `useLayoutEffect`
   - Not using `@milkdown/react` MilkdownProvider since it adds complexity without benefit

2. **useLayoutEffect with loadingRef guard**
   - Official pattern uses `useLayoutEffect` + `loadingRef` to prevent double-initialization in StrictMode
   - This is critical to prevent two editors from being created

3. **CSS Variables for theming**
   - Official crepe.css defines Crepe color variables for both light and dark modes
   - Import `@milkdown/theme-nord/style.css` as base

4. **Features configuration**
   - `[Crepe.Feature.BlockEdit]: false` - No block-level editing UI
   - `[Crepe.Feature.Latex]: false` - No LaTeX support
   - `[Crepe.Feature.LinkTooltip]: true` - Enable link editing

## Risks / Trade-offs

- **Risk**: React StrictMode causes double invocation in development
  - **Mitigation**: `loadingRef` guard pattern from official implementation

- **Risk**: TypeScript module resolution issues with @milkdown packages
  - **Mitigation**: Using `// @ts-nocheck` or `any` type assertions where needed

## Open Questions

- None - official implementation provides clear pattern to follow