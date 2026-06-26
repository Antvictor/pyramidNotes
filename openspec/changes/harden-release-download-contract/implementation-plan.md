# harden-release-download-contract 详细实现计划

> **Goal:** 把桌面应用的 Release 产物、GitHub Actions 发布流程、以及后续官网下载消费之间的契约固定下来。四个正式支持目标必须全部可验证：`macOS x64`、`macOS arm64`、`Windows x64`、`Windows ia32`。

**Architecture:** 用仓库内的 release contract 模块作为单一事实源，负责声明目标、识别文件名、选出每个平台的 primary asset、生成 metadata，并提供给 workflow 校验脚本和测试复用。当前 Windows primary installer 是一个同时服务 `x64` 和 `ia32` 的共享安装器。

**Tech Stack:** GitHub Actions + Node.js CommonJS scripts + existing `electron-builder` outputs

---

## Component Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   electron-builder outputs                   │
│   dmg / zip / exe files under release/                      │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ scripts/release-contract.cjs                                │
│ - TARGETS                                                   │
│ - classifyAsset(filename)                                   │
│ - choosePrimaryAsset(target, assets)                        │
│ - buildReleaseMetadata({ tag, files, prerelease })          │
└──────────────────────────────┬───────────────────────────────┘
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
┌──────────────────────────────┐  ┌────────────────────────────┐
│ scripts/verify-release-      │  │ scripts/generate-release-  │
│ assets.cjs                   │  │ metadata.cjs               │
│ - fail on missing targets    │  │ - write release metadata   │
│ - fail on ambiguous names    │  │ - validate required schema │
└───────────────┬──────────────┘  └──────────────┬─────────────┘
                │                                 │
                ▼                                 ▼
┌────────────────────────────────────────────────────────────────┐
│ .github/workflows/release.yml                                 │
│ - build                                                       │
│ - download artifacts                                          │
│ - validate                                                    │
│ - generate metadata                                           │
│ - gh release create                                           │
└────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
electron-builder finishes
  → release/ contains platform artifacts
  → verify-release-assets.cjs reads filenames
    → classifyAsset() maps each file to target + kind
    → choosePrimaryAsset() picks one default file per target
    → validation fails if any target missing / duplicated / ambiguous
  → generate-release-metadata.cjs serializes validated mapping
    → outputs release metadata JSON
  → workflow publishes GitHub Release using validated files only
```

## Interface Definitions

Create: `/Users/exccedy/project/AntVictor/app/pyramidNotes/scripts/release-contract.cjs`

Expected module surface:

```js
const TARGETS = {
  macosX64: 'macos-x64',
  macosArm64: 'macos-arm64',
  windowsX64: 'windows-x64',
  windowsIa32: 'windows-ia32',
};

function classifyAsset(fileName) {}
function choosePrimaryAsset(targetKey, assets) {}
function buildReleaseMetadata({ tag, releaseName, publishedAt, prerelease, assetsByTarget }) {}

module.exports = {
  TARGETS,
  classifyAsset,
  choosePrimaryAsset,
  buildReleaseMetadata,
};
```

Rules this module must encode:
- `Pyramid Notes-<version>.dmg` → `macos-x64`, kind `installer`, primary candidate
- `Pyramid Notes-<version>-arm64.dmg` → `macos-arm64`, kind `installer`, primary candidate
- `Pyramid Notes-<version>-mac.zip` → `macos-x64`, kind `archive`
- `Pyramid Notes-<version>-arm64-mac.zip` → `macos-arm64`, kind `archive`
- `Pyramid Notes Setup <version>.exe` → shared Windows installer, primary candidate for both `windows-x64` and `windows-ia32`
- `Pyramid Notes-<version>-win.zip` → `windows-x64`, kind `archive`
- `Pyramid Notes-<version>-ia32-win.zip` → `windows-ia32`, kind `archive`

---

## Task 1: Audit Real Build Outputs

**Files:**
- Inspect: [electron/package.json](/Users/exccedy/project/AntVictor/app/pyramidNotes/electron/package.json:9)
- Inspect: [docs/BUILD.md](/Users/exccedy/project/AntVictor/app/pyramidNotes/docs/BUILD.md:38)
- Inspect: [docs/RELEASE.md](/Users/exccedy/project/AntVictor/app/pyramidNotes/docs/RELEASE.md:49)

### Step 1.1: Confirm expected artifact families from `electron-builder`

The current packaging config already declares the supported matrix, but the plan must validate real filenames before codifying them.

Read:
- [electron/package.json](/Users/exccedy/project/AntVictor/app/pyramidNotes/electron/package.json:24) for mac targets
- [electron/package.json](/Users/exccedy/project/AntVictor/app/pyramidNotes/electron/package.json:37) for Windows targets

Expected conclusion:
- macOS emits `dmg` and `zip` for `x64` and `arm64`
- Windows emits `nsis` and `zip` for `x64` and `ia32`

### Step 1.2: Reconcile documented filenames with actual builder naming

Documented examples today:
- [docs/BUILD.md](/Users/exccedy/project/AntVictor/app/pyramidNotes/docs/BUILD.md:42)
- [docs/RELEASE.md](/Users/exccedy/project/AntVictor/app/pyramidNotes/docs/RELEASE.md:62)

Do:
- Compare docs against actual `electron-builder` naming conventions already used in prior local builds or release artifacts if available
- Decide the exact Windows ia32 installer filename pattern to support

Output:
- A final filename table that the contract module will enforce

### Step 1.3: Define primary asset selection per target

Primary asset rule:
- `dmg` is primary for both macOS targets
- the shared `Pyramid Notes Setup <version>.exe` is primary for both Windows targets
- `zip` remains published but non-primary

This rule belongs in code and tests, not only docs.

### Step 1.4: Freeze the contract in code constants

Create: `/Users/exccedy/project/AntVictor/app/pyramidNotes/scripts/release-contract.cjs`

Initial structure:

```js
const TARGETS = {
  macosX64: 'macos-x64',
  macosArm64: 'macos-arm64',
  windowsX64: 'windows-x64',
  windowsIa32: 'windows-ia32',
};

const PRIMARY_KIND_BY_TARGET = {
  [TARGETS.macosX64]: 'installer',
  [TARGETS.macosArm64]: 'installer',
  [TARGETS.windowsX64]: 'installer',
  [TARGETS.windowsIa32]: 'installer',
};
```

Verification:
- The module exports only static, deterministic rules
- No workflow-specific logic lives outside this contract

---

## Task 2: Build Validation + Metadata Scripts

**Files:**
- Create: `/Users/exccedy/project/AntVictor/app/pyramidNotes/scripts/release-contract.cjs`
- Create: `/Users/exccedy/project/AntVictor/app/pyramidNotes/scripts/verify-release-assets.cjs`
- Create: `/Users/exccedy/project/AntVictor/app/pyramidNotes/scripts/generate-release-metadata.cjs`

### Step 2.1: Implement `classifyAsset(fileName)`

In `/Users/exccedy/project/AntVictor/app/pyramidNotes/scripts/release-contract.cjs`, implement a pure classifier:

```js
function classifyAsset(fileName) {
  if (/^Pyramid Notes-\d+\.\d+\.\d+\.dmg$/.test(fileName)) {
    return { target: TARGETS.macosX64, kind: 'installer', fileName };
  }
  if (/^Pyramid Notes-\d+\.\d+\.\d+-arm64\.dmg$/.test(fileName)) {
    return { target: TARGETS.macosArm64, kind: 'installer', fileName };
  }
  if (/^Pyramid Notes-\d+\.\d+\.\d+-mac\.zip$/.test(fileName)) {
    return { target: TARGETS.macosX64, kind: 'archive', fileName };
  }
  if (/^Pyramid Notes-\d+\.\d+\.\d+-arm64-mac\.zip$/.test(fileName)) {
    return { target: TARGETS.macosArm64, kind: 'archive', fileName };
  }
  if (/^Pyramid Notes Setup \d+\.\d+\.\d+\.exe$/.test(fileName)) {
    return { target: 'windows-shared-installer', kind: 'installer', fileName };
  }
  if (/^Pyramid Notes-\d+\.\d+\.\d+-win\.zip$/.test(fileName)) {
    return { target: TARGETS.windowsX64, kind: 'archive', fileName };
  }
  if (/^Pyramid Notes-\d+\.\d+\.\d+-ia32-win\.zip$/.test(fileName)) {
    return { target: TARGETS.windowsIa32, kind: 'archive', fileName };
  }
  return null;
}
```

The audited local build already shows this shared Windows installer pattern, so keep the regex aligned with that exact output unless the packaging config changes.

### Step 2.2: Implement primary selection and grouping

In the same file, add:

```js
function choosePrimaryAsset(targetKey, assets) {
  const installer = assets.find((asset) => asset.kind === 'installer');
  if (!installer) {
    throw new Error(`Missing primary installer for ${targetKey}`);
  }
  return installer;
}
```

Also add a helper that groups classified assets by target and rejects:
- unknown files in the validated set
- more than one installer for the same target
- zero files for any required target

For Windows, the grouping helper must explicitly project the one shared installer into both `windows-x64` and `windows-ia32` target buckets before primary selection.

### Step 2.3: Implement metadata builder

In `/Users/exccedy/project/AntVictor/app/pyramidNotes/scripts/release-contract.cjs`:

```js
function buildReleaseMetadata({ tag, releaseName, publishedAt, prerelease, assetsByTarget }) {
  return {
    tag,
    name: releaseName,
    prerelease,
    publishedAt,
    targets: {
      [TARGETS.macosX64]: toTargetEntry(assetsByTarget[TARGETS.macosX64]),
      [TARGETS.macosArm64]: toTargetEntry(assetsByTarget[TARGETS.macosArm64]),
      [TARGETS.windowsX64]: toTargetEntry(assetsByTarget[TARGETS.windowsX64]),
      [TARGETS.windowsIa32]: toTargetEntry(assetsByTarget[TARGETS.windowsIa32]),
    },
  };
}
```

Each `toTargetEntry(...)` result must contain:
- `fileName`
- `url`
- `kind`

### Step 2.4: Implement `verify-release-assets.cjs`

Create a CLI script that:
- accepts a release directory path
- reads filenames from that directory recursively
- classifies only published assets
- fails with `process.exit(1)` on:
  - missing target
  - ambiguous target installer
  - missing metadata minimum fields

Suggested CLI:

```bash
node scripts/verify-release-assets.cjs --release-dir release --tag v1.0.0 --release-name v1.0.0
```

Expected terminal behavior:
- success: prints one line per target and selected primary asset
- failure: prints the exact missing or ambiguous filename

### Step 2.5: Implement `generate-release-metadata.cjs`

Create a second CLI script that reuses the contract helpers and writes:

`/Users/exccedy/project/AntVictor/app/pyramidNotes/release/release-metadata.json`

Suggested output shape:

```json
{
  "tag": "v1.0.0",
  "name": "v1.0.0",
  "prerelease": false,
  "publishedAt": "2026-06-26T00:00:00.000Z",
  "targets": {
    "macos-x64": {
      "fileName": "Pyramid Notes-1.0.0.dmg",
      "url": "https://github.com/Antvictor/pyramidNotes/releases/download/v1.0.0/Pyramid%20Notes-1.0.0.dmg",
      "kind": "installer"
    }
  }
}
```

The script must derive URLs from tag + filename; it must not call GitHub APIs.

---

## Task 3: Wire the Release Workflow

**Files:**
- Modify: [release.yml](/Users/exccedy/project/AntVictor/app/pyramidNotes/.github/workflows/release.yml:1)

### Step 3.1: Keep build jobs focused on producing artifacts

Current upload patterns are too broad:
- [release.yml](/Users/exccedy/project/AntVictor/app/pyramidNotes/.github/workflows/release.yml:43)
- [release.yml](/Users/exccedy/project/AntVictor/app/pyramidNotes/.github/workflows/release.yml:85)

Do not publish directly from globs without validation.

### Step 3.2: Add validation tooling to the release job

In `create-release`, before `gh release create`, add Node setup + dependency install so scripts can run on Ubuntu:

```yaml
      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: '20.20.2'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --ignore-scripts
```

Then add:

```yaml
      - name: Validate release assets
        run: node scripts/verify-release-assets.cjs --release-dir release --tag "${{ github.ref_name }}" --release-name "${{ github.ref_name }}"

      - name: Generate release metadata
        run: node scripts/generate-release-metadata.cjs --release-dir release --tag "${{ github.ref_name }}" --release-name "${{ github.ref_name }}"
```

### Step 3.3: Publish only validated assets

Replace the final `gh release create` input set so it publishes:
- validated desktop artifacts
- generated `release/release-metadata.json`

Do not rely on `release/**/*` anymore if that would include unrelated files.

Implementation direction:
- either have the validator emit a stable manifest file with allowed paths
- or have `generate-release-metadata.cjs` also emit an asset list consumed by the workflow

Preferred approach:
- validator writes `release/publish-manifest.json`
- release step reads the explicit path list from that manifest

### Step 3.4: Mark prerelease behavior explicitly

Use a deterministic rule in workflow inputs:
- tags containing `-alpha`, `-beta`, or `-rc` set GitHub Release `--prerelease`
- plain `v<semver>` tags publish as stable

This must match the metadata `prerelease` boolean exactly.

---

## Task 4: Add Contract Tests

**Files:**
- Create: `/Users/exccedy/project/AntVictor/app/pyramidNotes/electron/common/releaseContract.test.cjs`
  or `/Users/exccedy/project/AntVictor/app/pyramidNotes/scripts/release-contract.test.cjs`

### Step 4.1: Test filename classification

Add fixture-driven tests for:
- `Pyramid Notes-1.0.0.dmg`
- `Pyramid Notes-1.0.0-arm64.dmg`
- `Pyramid Notes-1.0.0-mac.zip`
- `Pyramid Notes-1.0.0-arm64-mac.zip`
- `Pyramid Notes Setup 1.0.0.exe`
- ia32 installer exact filename once audited
- `Pyramid Notes-1.0.0-win.zip`
- `Pyramid Notes-1.0.0-ia32-win.zip`

Expected assertions:
- exact target match
- exact `kind` match
- unknown filename returns `null`

### Step 4.2: Test primary asset selection

Given a target with both installer and archive:
- installer must be selected as `primary`

Given a target with only archive:
- throw an explicit error

Given two installers for one target:
- validation helper must fail

Given one shared Windows installer plus both Windows ZIP files:
- both `windows-x64` and `windows-ia32` target entries must resolve successfully

### Step 4.3: Test metadata schema

Assert that generated metadata contains:
- `tag`
- `name`
- `prerelease`
- `publishedAt`
- `targets.macos-x64.fileName`
- `targets.macos-arm64.fileName`
- `targets.windows-x64.fileName`
- `targets.windows-ia32.fileName`
- corresponding `url` fields for each target

### Step 4.4: Test prerelease selection

Add tests for:
- `v1.0.0` → `prerelease: false`
- `v1.0.0-alpha.1` → `prerelease: true`
- `v1.0.0-beta.2` → `prerelease: true`
- `v1.0.0-rc.1` → `prerelease: true`

---

## Task 5: Align Docs and Local Commands

**Files:**
- Modify: [BUILD.md](/Users/exccedy/project/AntVictor/app/pyramidNotes/docs/BUILD.md:1)
- Modify: [RELEASE.md](/Users/exccedy/project/AntVictor/app/pyramidNotes/docs/RELEASE.md:1)
- Modify: [launch-roadmap.md](/Users/exccedy/project/AntVictor/app/pyramidNotes/openspec/launch-roadmap.md:1)

### Step 5.1: Update build output documentation

In [BUILD.md](/Users/exccedy/project/AntVictor/app/pyramidNotes/docs/BUILD.md:38):
- add Windows ia32 installer + zip rows using the exact audited filenames
- state clearly that `.dmg` / `.exe` are primary downloads
- state that `.zip` files remain portable secondary assets

### Step 5.2: Update release procedure

In [RELEASE.md](/Users/exccedy/project/AntVictor/app/pyramidNotes/docs/RELEASE.md:23):
- remove the manual `gh release create ./*` flow
- document that pushing a tag triggers validation, metadata generation, and release publication
- document prerelease tag naming rules
- mention the generated `release-metadata.json`

### Step 5.3: Reflect roadmap status accurately

In [launch-roadmap.md](/Users/exccedy/project/AntVictor/app/pyramidNotes/openspec/launch-roadmap.md:229):
- update `create-bilingual-demo-workspaces` from `待开始` to completed / ready to archive
- update `harden-release-download-contract` from `待开始` to `进行中`

---

## Execution Order

1. Audit actual filenames and lock down the target table.
2. Implement `release-contract.cjs`.
3. Implement validator + metadata generator.
4. Add tests for classification, primary selection, metadata schema, prerelease logic.
5. Update `.github/workflows/release.yml` to call the scripts before release creation.
6. Update docs and roadmap status.
7. Run local verification commands and record any limits.

## Verification Commands

Run during Step 5 implementation:

```bash
node scripts/verify-release-assets.cjs --release-dir <fixture-or-real-release-dir> --tag v1.0.0 --release-name v1.0.0
```

```bash
node scripts/generate-release-metadata.cjs --release-dir <fixture-or-real-release-dir> --tag v1.0.0 --release-name v1.0.0
```

```bash
node --test scripts/release-contract.test.cjs
```

If the repo already uses a different test harness for CommonJS utility tests, keep the assertions in that harness instead of introducing a second framework.
