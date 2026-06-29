## Execution Order

```text
media spec document
    ↓
capture-product-media.mjs
    ↓
capture-product-workflow.mjs
    ↓
regenerate website assets
    ↓
verify quality and website integration
```

## 1. Write Website Media Specification

**Goal**

Create a single readable source of truth for website screenshot and workflow video quality standards.

**Outputs**

- A new spec document under `docs/marketing/assets/`
- Clear standards for screenshot size, workflow pacing, language consistency, and privacy checks

- [x] 1.1 Add website media capture spec document
  - Define screenshot target size and output format
  - Mark the document explicitly as `website-first`
  - Define workflow recording size, pacing, and quality targets
  - Define mandatory scenes to capture
  - Define QA checklist for readability, privacy, and language correctness

## 2. Upgrade Static Screenshot Automation

**Goal**

Make static screenshot generation suitable for large website display areas.

**Outputs**

- Higher-resolution screenshot automation
- Stable bilingual output paths

- [x] 2.1 Modify `scripts/capture-product-media.mjs`
  - Increase default capture viewport/output size above the current `1440x980`
  - Keep bilingual scene generation consistent
  - Preserve existing output naming conventions when possible
  - Ensure regenerated files can overwrite current website asset paths directly

## 3. Upgrade Workflow Recording Automation

**Goal**

Generate a clearer and slower website-ready workflow `webm`.

**Outputs**

- Higher-quality workflow recording
- Slower, more readable workflow pacing

- [x] 3.1 Modify `scripts/capture-product-workflow.mjs`
  - Increase workflow capture size above the current `1280x860`
  - Increase effective recording frame rate above the current `6fps`, targeting `10fps - 12fps`
  - Increase step delays into a slower readable range, targeting roughly `1200ms - 2200ms` per step
  - Keep `webm` as the primary website video output

## 4. Regenerate Website Product Media

**Goal**

Replace website-facing bilingual screenshots and workflow videos with higher-quality outputs.

**Outputs**

- Updated `website/assets/product-media/en/*`
- Updated `website/assets/product-media/zh/*`

- [x] 4.1 Regenerate key English assets
  - `en-tree-overview-desktop.png`
  - `en-editor-open-note-desktop.png`
  - `en-search-fulltext-desktop.png`
  - `en-node-operations-desktop.png`
  - `en-workflow-open-edit-search.webm`

- [x] 4.2 Regenerate key Chinese assets
  - `zh-tree-overview-desktop.png`
  - `zh-editor-open-note-desktop.png`
  - `zh-search-fulltext-desktop.png`
  - `zh-node-operations-desktop.png`
  - `zh-workflow-open-edit-search.webm`

## 5. Verify Output Quality

**Goal**

Confirm the regenerated assets actually solve the website quality issue.

**Outputs**

- Verified screenshot readability
- Verified workflow pacing
- Verified path compatibility with current website references

- [x] 5.1 Quality verification
  - Confirm PNG readability at current website display sizes
  - Confirm workflow `webm` no longer feels too fast
  - Confirm current `website/src/content/siteContent.js` references remain valid
  - Confirm no privacy or language inconsistency issues were introduced
  - Confirm website users do not need to open the image in a new tab to read core UI text
