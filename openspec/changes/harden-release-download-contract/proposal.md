## Why

The current release pipeline builds the right platform variants, but the contract between build outputs, GitHub Release assets, and future website download logic is still implicit. File naming, Windows ia32 support, prerelease handling, and asset completeness checks need to be made explicit now so the bilingual download site can depend on a stable release surface.

## What Changes

- Define a release download contract for the four supported targets: macOS x64, macOS arm64, Windows x64, and Windows ia32.
- Require deterministic asset naming and platform-to-asset mapping that downstream download logic can parse without heuristics.
- Add release workflow validation so GitHub Releases fail fast when any required asset is missing or ambiguously named.
- Define stable release metadata for downstream consumers, including prerelease/latest selection rules.
- Align build and release documentation with the enforced contract and Windows ia32 support requirement.

## Capabilities

### New Capabilities
- `release-download-contract`: Defines required release assets, naming rules, metadata shape, and validation behavior for published desktop builds.

### Modified Capabilities
- None.

## Impact

- Affected code:
  - `.github/workflows/release.yml`
  - `electron/package.json`
  - `docs/BUILD.md`
  - `docs/RELEASE.md`
  - New release validation and metadata generation helpers under `scripts/` or an equivalent local location
- Affected systems:
  - GitHub Actions release pipeline
  - GitHub Release asset contract consumed by the future download site
- Dependencies:
  - No new external services
  - May add local workflow helper scripts and tests
