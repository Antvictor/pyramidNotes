# Implementation Plan: Reposition Website Homepage

## Objective

Reposition the Pyramid Notes homepage from a feature-first "tree Markdown notes" description to a problem-first narrative about building a long-term knowledge system. The implementation should preserve the current restrained visual language while changing the homepage story, section order, and metadata in both Chinese and English.

## Constraints

- Keep the current website architecture and rendering model.
- Do not introduce a visual redesign that changes the product tone.
- Preserve existing download behavior, release lookup behavior, and bilingual routing.
- Avoid claims about sync, collaboration, cloud, AI, or mobile workflows.
- Keep copy calm, technical, and suitable for programmers, researchers, and knowledge workers.

## Execution Order

### Phase 1: Content Model Rewrite

1. Update shared root landing copy in `website/src/content/siteContent.js`.
   - Replace the current root-level product summary so the first-contact message describes long-term knowledge organization rather than a tree note editor.
   - Ensure root copy aligns with the new homepage framing and does not reintroduce the old "tree Markdown notes" positioning.

2. Rewrite homepage brand/supporting copy fields in `website/src/content/siteContent.js`.
   - Add localized brand tagline fields instead of relying on a hardcoded implementation-first line.
   - Rewrite Hero copy in both `zh` and `en`:
     - status badge becomes `Early Access` / `抢先体验版`
     - headline leads with user pain and knowledge growth
     - body explains tree structure and Markdown nodes after the emotional/problem framing
   - Keep the CTA structure unchanged.

3. Add new localized homepage sections in `website/src/content/siteContent.js`.
   - Add a `why` section:
     - problem statement
     - explanation of why existing note accumulation breaks down over time
     - Pyramid Notes response: structure first, content second
   - Add a `principles` or equivalent section with four cards:
     - build the map before filling content
     - every node is a full Markdown knowledge unit
     - structure must be easy to reorganize
     - search should return both content and position
   - Add a `story` section for the developer origin narrative.

4. Rewrite scenario-oriented content in `website/src/content/siteContent.js`.
   - Reframe "适合/不适合" and the supporting scenario section around long-term knowledge work rather than generic note-taking.
   - Preserve the already confirmed suitable / unsuitable lists.
   - Adjust any nearby explanatory copy so it reads as fit guidance for knowledge-system building.

5. Update download and release-facing copy in `website/src/content/siteContent.js`.
   - Replace `Alpha` phrasing with `Early Access`.
   - Rewrite the download section headline/body so it invites users to start building a knowledge system rather than trying a tree note tool.
   - Keep version-fetch and GitHub Releases fallback behavior unchanged.

### Phase 2: Homepage Rendering Changes

6. Refactor `website/src/main.js` to consume content-driven brand copy.
   - Remove the hardcoded tagline from `renderBrandTagline()`.
   - Read localized brand tagline text from `siteContent`.
   - Ensure the topbar, Hero, and root landing view all reflect the same new positioning.

7. Add new render helpers in `website/src/main.js`.
   - Implement `renderWhySection(...)`.
   - Implement `renderPrinciplesSection(...)`.
   - Implement `renderStorySection(...)`.
   - Keep them structurally consistent with the current render style and section density.

8. Reorder homepage sections in `website/src/main.js`.
   - Update the page composition so the narrative becomes:
     1. Hero with problem-first framing
     2. Why Pyramid Notes exists
     3. Core principles / knowledge-system framing
     4. Existing walkthrough / product flow content
     5. Long-term use scenarios
     6. Suitable / unsuitable audience guidance
     7. Developer story
     8. Download / release info / requirements
   - Preserve existing behavior for screenshots, CTA buttons, release fetching, and information lists.

### Phase 3: Styling

9. Extend `website/src/styles/site.css` for the new sections.
   - Add section styles for `why`, `principles`, and `story`.
   - Reuse current spacing, surface, border, and typography patterns where possible.
   - Keep the tone restrained and technical rather than promotional.

10. Adjust Hero and section rhythm only as needed.
   - Ensure the new Hero copy still fits cleanly on desktop and mobile.
   - Maintain visual hierarchy so the first screen clearly communicates the problem before implementation details.
   - Avoid decorative redesign or unrelated visual experimentation.

### Phase 4: Metadata Alignment

11. Update homepage metadata files:
   - `website/index.html`
   - `website/en/index.html`
   - `website/zh/index.html`
   - Rewrite title/description/OG summary so they describe Pyramid Notes as a local-first knowledge management tool for evolving knowledge structures.
   - Ensure metadata no longer falls back to the old "tree Markdown notes" story.

### Phase 5: Verification

12. Run website build verification.
   - Build the website successfully.
   - Confirm no regressions in homepage generation and localized output.

13. Perform content and flow review in both languages.
   - Check that the Hero starts from user pain.
   - Check that technical selling points remain present but subordinate to the narrative.
   - Check that the top brand line, root landing view, and metadata all match the new positioning.
   - Check that the suitable / unsuitable section remains exactly aligned with the previously confirmed content constraints.

## Expected Files To Change

- `website/src/content/siteContent.js`
- `website/src/main.js`
- `website/src/styles/site.css`
- `website/index.html`
- `website/en/index.html`
- `website/zh/index.html`

## Acceptance Criteria

- The homepage no longer reads like "another tree Markdown note app" on first contact.
- The first screen addresses note fragmentation and long-term organization problems before explaining implementation details.
- The homepage explicitly presents Pyramid Notes as a local-first tool for building an evolving knowledge system.
- The site still communicates the concrete product capabilities:
  - local-first
  - Markdown at each node
  - tree structure
  - search
  - subtree movement
- The new `Why this exists` and developer story sections are present in both Chinese and English.
- `Alpha` is replaced with `Early Access` / `抢先体验版`.
- Existing download/release behavior still works.
- Desktop and mobile layouts remain readable without a visual redesign.
