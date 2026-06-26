## Context

The repository already builds desktop artifacts for macOS x64, macOS arm64, Windows x64, and Windows ia32 through `electron-builder`, but the release pipeline still treats the output directory as an opaque blob. The current workflow uploads broad glob patterns and creates a GitHub Release from whatever files happen to exist, while the build and release docs describe platform coverage inconsistently.

This becomes a concrete problem for the upcoming bilingual download site, which needs a stable way to map a visitor's OS and CPU architecture to a single release asset. The contract also needs to preserve Windows ia32 support because some machines in real use still depend on the 32-bit SQLite path.

## Goals / Non-Goals

**Goals:**
- Define one canonical asset contract for the four supported desktop targets.
- Fail the release workflow before publishing when any required asset is missing or named ambiguously.
- Emit machine-readable release metadata that downstream code can consume without guessing from filenames.
- Document prerelease and "latest" selection rules so the website and release process behave consistently.
- Align local build and release docs with the enforced workflow behavior.

**Non-Goals:**
- Rebuild the download website in this change.
- Change the core Electron packaging targets beyond codifying the current supported set.
- Publish or mutate remote GitHub Releases during this change.

## Decisions

### Decision: Treat four desktop targets as the required contract

The contract will require exactly these user-facing targets:
- macOS x64
- macOS arm64
- Windows x64
- Windows ia32

Rationale:
- They match the current `electron-builder` configuration.
- Windows ia32 is a real support requirement, not an optional legacy artifact.
- A fixed target set is easier to validate and easier for the website to consume.

Alternatives considered:
- Making Windows ia32 optional. Rejected because it would make the release surface unstable and break known user environments.
- Publishing only generic "Windows" links. Rejected because architecture-specific compatibility matters.

### Decision: Validate against an explicit manifest instead of loose globs

The release workflow will validate the output directory against an explicit expected asset list or platform manifest before creating the GitHub Release.

Rationale:
- Glob uploads hide missing variants until users discover broken downloads.
- Explicit validation keeps naming and completeness rules in one place.
- The same manifest can drive metadata generation and tests.

Alternatives considered:
- Continue using wildcard uploads only. Rejected because it does not detect missing or renamed files.
- Hardcode validation logic separately in multiple workflow steps. Rejected because it duplicates the contract.

### Decision: Generate repository-local release metadata from validated assets

After validation, the workflow or helper script will generate a stable metadata document describing the release tag, prerelease status, and per-target download mapping. The metadata will designate exactly one primary download per supported target even if the release also publishes auxiliary artifacts such as portable ZIP files.

Rationale:
- The future website should read a stable contract, not infer semantics from GitHub asset names on every request.
- Generating metadata from validated assets keeps docs, tests, and downstream consumers aligned.

Alternatives considered:
- Rely only on runtime GitHub API parsing in the website. Rejected because it pushes contract ambiguity downstream and makes testing harder.
- Hand-maintain metadata. Rejected because it would drift from the actual release artifacts.

### Decision: Separate required target coverage from per-target primary download selection

The contract will allow more than one published asset per target family, but it will require metadata to identify exactly one primary asset for each supported target. A single validated installer MAY be shared by multiple supported targets when the built artifact is intentionally multi-architecture, as with the current Windows NSIS installer.

Rationale:
- macOS and Windows builds can legitimately emit both installer-style and archive-style artifacts.
- The download site needs one deterministic default link per target instead of making that choice at runtime.

Alternatives considered:
- Requiring exactly one published file per target. Rejected because it would unnecessarily remove useful portable artifacts.
- Letting the website choose among multiple assets heuristically. Rejected because it recreates the ambiguity this change is meant to remove.

### Decision: Model the current Windows NSIS installer as a shared primary asset

The release contract will treat the current `Pyramid Notes Setup <version>.exe` artifact as a shared primary installer for both `windows-x64` and `windows-ia32`, while keeping the per-architecture ZIP files distinct.

Rationale:
- The audited local build output contains one Windows installer and two architecture-specific unpacked/ZIP outputs.
- This preserves Windows ia32 support without inventing a second installer filename the current build does not produce.
- The website still gets deterministic per-target metadata because both Windows targets can point to the same primary installer and distinct secondary archives.

Alternatives considered:
- Requiring separate x64 and ia32 installers immediately. Rejected because it does not match the current build output and would turn this contract change into a packaging redesign.
- Treating the shared installer as `windows-x64` only. Rejected because it would hide real ia32 install support from downstream consumers.

### Decision: Make prerelease handling explicit

The contract will define how Alpha and prerelease tags are marked and whether they count as the default "latest" download candidate.

Rationale:
- The roadmap explicitly requires a stable latest-selection policy.
- GitHub's default prerelease behavior is not enough if the website needs predictable filtering.

Alternatives considered:
- Leave prerelease behavior implicit in GitHub UI state. Rejected because downstream code would need undocumented assumptions.

## Risks / Trade-offs

- [Electron-builder output names differ slightly across versions] -> Keep the contract grounded in actual generated filenames and back it with validation tests.
- [Adding validation may fail the first few release runs] -> Update docs and make failure messages name the missing or ambiguous asset directly.
- [Metadata shape may need small extensions once the website is built] -> Keep the first version minimal but structured so new optional fields can be added compatibly.
- [Windows ia32 support increases build and test surface] -> Accept the extra maintenance cost because it protects real user machines.
- [Multiple artifact types per target could confuse the default download choice] -> Require metadata to mark one primary asset per supported target and test that mapping explicitly.
- [One installer serving two Windows targets could be misread as missing ia32 support] -> Document the shared-installer rule explicitly and expose distinct ia32 archive metadata alongside it.
