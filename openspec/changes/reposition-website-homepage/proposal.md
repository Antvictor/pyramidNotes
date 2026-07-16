# Reposition Website Homepage

## Why

The current Pyramid Notes homepage explains the product mostly as a "tree-structured Markdown notes tool". That description is technically correct, but it leads with implementation and feature framing rather than the user's problem:

- notes keep accumulating
- information fragments stop forming a coherent system
- folders and flat note lists do not express how knowledge evolves over time

The website therefore undersells the product's real positioning: a local-first knowledge management tool for building long-lived knowledge systems.

## What Changes

- Reposition the homepage narrative from "tree Markdown notes app" to "local-first knowledge management tool for evolving knowledge systems".
- Rewrite the Hero section so it starts from the user's pain point and the emotional/organizational problem instead of leading with technical descriptors.
- Change the public release label from `Alpha` to `Early Access` / `抢先体验版`.
- Update the top navigation tagline and the root landing copy so the old "tree notes" framing does not remain in the first visible brand layer.
- Add a "Why this exists" section that explains why ordinary note accumulation breaks down over time.
- Add a "From recording to building a knowledge system" section that explains the product's core philosophy in four parts:
  - knowledge structure
  - node content
  - knowledge restructuring
  - search and recall
- Add a developer story section that explains why Pyramid Notes was created and what kind of user it is for.
- Reframe the scenario section around long-term knowledge work rather than a feature-adjacent list.
- Update the download section copy so it reinforces the knowledge-system positioning while preserving the current release-routing behavior.
- Update homepage metadata text (`title`, description, and OG-facing copy where applicable) so search/share snippets match the new positioning.

## Scope

### In Scope

- Homepage copy and section ordering
- New homepage content sections
- Bilingual content updates in Chinese and English
- Small rendering additions in the website app
- Small styling additions for new sections
- Root landing copy and homepage metadata copy

### Out of Scope

- Any change to release metadata loading or platform recommendation logic
- Any change to product screenshots, GIFs, or capture workflow
- Any change to desktop app behavior
- Any change to the website's visual design system beyond what is needed to support the new sections

## Impact

- Affected code:
- `website/src/content/siteContent.js`
- `website/src/main.js`
- `website/src/styles/site.css`
- Required metadata follow-up:
  - `website/index.html`
  - `website/en/index.html`
  - `website/zh/index.html`
- No backend or desktop runtime impact
