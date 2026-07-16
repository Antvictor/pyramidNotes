## Context

The current website is a content-driven static site. Most homepage messaging is defined in `website/src/content/siteContent.js`, rendered by `website/src/main.js`, and styled by `website/src/styles/site.css`.

The present homepage already has a strong visual system and a working bilingual content model. Its weakness is not aesthetics or missing product assets. The weakness is narrative framing:

- it describes what the product is built with and what it can do
- it does not clearly explain why a user with a growing body of notes should care

The redesign must therefore preserve the current restrained, indie, product-first visual language while replacing the story told on the page.

## Goals / Non-Goals

**Goals**

- Lead with the problem of note accumulation and structural disorder.
- Reposition Pyramid Notes as a local-first knowledge management tool rather than a generic note editor.
- Explain the product's structural philosophy clearly enough that a programmer, researcher, or knowledge worker immediately understands the intended use.
- Preserve the current technical credibility:
  - local-first
  - Markdown
  - tree structure
  - search
  - subtree movement
- Add founder context so the product feels intentional rather than generic.
- Keep the page restrained, clear, and technically literate.

**Non-Goals**

- This change does not aim to make the page more promotional, louder, or more lifestyle-oriented.
- This change does not introduce customer testimonials, pricing, newsletter capture, or community modules.
- This change does not redesign the entire visual language or media system.

## Narrative Decisions

### 1. Hero must change from implementation-first to pain-first

The current Hero leads with "tree-structured knowledge management tool". That is accurate but too abstract and too technical for the first sentence.

The new Hero should:

- frame the user problem first
- present Pyramid Notes as the response
- only then explain the structural method

Required Hero shift:

- from: describing a tool type
- to: describing a problem in long-term knowledge work

This means:

- new status label: `Early Access` / `抢先体验版`
- new headline centered on knowledge growth and disorder
- new supporting copy centered on structure as a living system
- the first paragraph must describe the user problem before naming Markdown or tree mechanics

### 2. "Why this exists" must become a first-class section

The site currently lacks an explicit articulation of the problem:

- recording is easy
- organization breaks later

This new section should explain:

- why folders and flat note collections stop working
- why content without stable placement becomes hard to retrieve or understand
- why Pyramid Notes starts from structure instead of isolated records

This section should read like product reasoning, not like marketing copy.

### 3. Core philosophy should replace feature-led explanation

The current walkthrough explains product behavior well, but the page also needs a conceptual layer.

The new philosophy section should reframe the product in four ideas:

1. Build structure before accumulating detail
2. Let each node hold full Markdown content
3. Make structural change normal through subtree movement
4. Combine search with position inside a system

These ideas should map directly to existing product capabilities without inventing new ones.

### 4. Scenarios should emphasize long-term knowledge work

The current scenarios are directionally correct, but the rewrite should make them feel less like examples of features and more like examples of durable knowledge work.

Preferred scenario framing:

- technical learning
- deep research
- writing / creative worldbuilding / structured long-form projects

The page can still retain the existing "course notes / research / technical knowledge base" logic, but the language should better express "long-term accumulation".

### 5. The developer story should communicate product intent

This section is important because Pyramid Notes is not a neutral commodity product. It comes from a specific frustration:

- too many notes
- weak structure
- folders fail to describe relationships
- links alone do not provide durable organization

This section should remain restrained and first-person-adjacent in tone without becoming a personal diary entry.

### 6. Old positioning must be removed from every first-contact surface

It is not enough to rewrite only the main Hero copy. The site currently contains old positioning in multiple first-contact surfaces:

- top brand tagline in `renderBrandTagline`
- root landing copy for the bilingual entry page
- HTML metadata and OG-facing summary text

If these remain unchanged, users will still read the site as a "tree notes tool" before they absorb the new homepage story.

Therefore the rewrite must include:

- brand tagline update
- `siteContent.root` headline / intro update
- homepage metadata copy update

## Structural Changes

### Existing sections to revise

- Brand tagline
- Root landing copy
- Hero
- Workflow / scenario supporting copy
- Download section copy

### New sections to add

- Why Pyramid Notes exists
- From recording to building a knowledge system
- Why the developer created Pyramid Notes

### Sections to keep conceptually

- Product walkthrough
- Workflow demo
- Suitable / less suitable workflows
- Download area
- System requirements / installation guidance

## File-Level Design

### `website/src/content/siteContent.js`

This file will carry most of the change.

Add or revise fields for:

- brand tagline
- root landing headline / intro / recommendation card support copy
- Hero title / intro / support copy
- status badge wording
- "why this exists" section
- "core philosophy" section with four cards
- scenario rewrite
- developer story section
- revised download copy

Both Chinese and English content must stay aligned structurally.

### `website/src/main.js`

Add render helpers for the new sections.

Recommended render additions:

- `renderWhySection`
- `renderPrinciplesSection`
- `renderStorySection`

Insert them in the page flow after Hero and before or around the existing walkthrough / scenarios so the narrative order becomes:

1. problem + product response
2. why it exists
3. core philosophy
4. product walkthrough / workflow
5. scenarios
6. founder story
7. download and operational information

Also move hard-coded brand tagline copy out of implementation-only wording. The rendered brand line should match the new product framing instead of "tree notes with Markdown at every node".

### `website/src/styles/site.css`

Add only the styling necessary for the new sections.

Keep:

- the current palette
- the current restrained panel system
- current spacing rhythm and soft gradients

Do not:

- switch to aggressive landing-page conventions
- add heavy marketing motifs
- make the founder section visually sentimental

The new sections should reuse the current panel language. A new section should not feel like it belongs to a different site template.

### `website/index.html`, `website/en/index.html`, `website/zh/index.html`

Metadata should be updated to match the new positioning.

This includes:

- page title
- meta description
- OG title / description where they still reflect the old framing

This is required, not optional, because search snippets and link previews are part of homepage positioning.

## Copy Constraints

The rewritten homepage must:

- sound useful to programmers, researchers, and knowledge workers
- remain calm and product-literate
- avoid exaggerated claims
- avoid generic startup phrases
- avoid sounding like "another Markdown app"
- avoid promising sync, collaboration, mobile apps, or AI capabilities that do not exist

Avoid terms such as:

- revolutionary
- all-in-one
- best-in-class
- effortless
- perfect second brain

Prefer terms such as:

- structure
- hierarchy
- evolving knowledge system
- long-term accumulation
- local-first
- durable organization

## Verification

The change is correct when:

- the first screen clearly communicates a user problem before technical features
- the homepage can be summarized as "knowledge system builder" rather than "tree note app"
- the top brand line and root landing copy no longer reintroduce the old positioning
- existing download routing continues to work unchanged
- both Chinese and English pages stay structurally aligned
- metadata and social preview text no longer describe the product primarily as a tree Markdown notes tool
- the tone still feels restrained, technical, and indie
