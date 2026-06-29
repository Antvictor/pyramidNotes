## ADDED Requirements

### Requirement: Release assets SHALL cover all supported desktop targets
The release process SHALL produce a validated download mapping for exactly four supported desktop targets: macOS x64, macOS arm64, Windows x64, and Windows ia32. Each target MUST resolve to a primary downloadable asset that matches the built platform support for that target. A primary asset MAY be shared by more than one supported target when the published artifact intentionally supports multiple target architectures.

#### Scenario: All required targets are present
- **WHEN** a release build completes successfully
- **THEN** the release contract includes one primary validated asset for macOS x64, one for macOS arm64, one for Windows x64, and one for Windows ia32

#### Scenario: One installer serves multiple Windows targets
- **WHEN** the validated release output contains one multi-architecture Windows installer and per-architecture Windows archives
- **THEN** the contract maps both Windows x64 and Windows ia32 to that installer as their primary asset while preserving distinct target entries

#### Scenario: A required target is missing
- **WHEN** any of the four supported targets does not have a matching release asset
- **THEN** the release workflow fails before publishing the GitHub Release

### Requirement: Release assets SHALL use deterministic platform naming
The release process SHALL enforce deterministic naming and target mapping for published assets so downstream consumers can identify the correct download without heuristic filename parsing. Asset classification MUST distinguish Windows x64 from Windows ia32 and macOS x64 from macOS arm64.

#### Scenario: Asset names are ambiguous
- **WHEN** two assets could map to the same supported target or one asset name does not identify its target unambiguously
- **THEN** the release workflow fails and reports the ambiguous asset names

#### Scenario: Asset names match the contract
- **WHEN** all produced assets follow the documented naming and target mapping rules
- **THEN** the workflow accepts the artifacts for publication and metadata generation

### Requirement: The release workflow SHALL validate assets before publication
Before creating or updating a GitHub Release, the workflow MUST validate the produced asset set against the documented release contract and MUST stop publication on the first contract violation.

#### Scenario: Validation passes
- **WHEN** every required asset is present and uniquely mapped
- **THEN** the workflow continues to publish the GitHub Release

#### Scenario: Validation fails
- **WHEN** the produced assets violate the contract
- **THEN** the workflow does not create or update the GitHub Release

### Requirement: The release process SHALL publish stable machine-readable metadata
The release process SHALL generate machine-readable metadata from the validated asset set. The metadata MUST identify the release tag, prerelease status, and per-target download mapping for macOS x64, macOS arm64, Windows x64, and Windows ia32. For each supported target, the metadata MUST expose exactly one primary asset entry with a filename and download URL, even when additional non-primary artifacts are published for the same target family. Multiple targets MAY reference the same primary asset when the validated artifact intentionally supports those targets.

#### Scenario: Metadata is generated from validated assets
- **WHEN** asset validation succeeds
- **THEN** the workflow generates metadata whose per-target URLs and filenames correspond exactly to the validated assets

#### Scenario: A downstream consumer reads metadata
- **WHEN** website or tooling code consumes the release metadata
- **THEN** it can determine the correct asset for each supported target without inferring architecture from raw filenames

#### Scenario: Multiple assets exist for one target family
- **WHEN** a release publishes both installer and archive artifacts for the same supported target family
- **THEN** the metadata still identifies exactly one primary asset for that supported target

#### Scenario: Multiple targets share one primary asset
- **WHEN** a validated installer supports both Windows x64 and Windows ia32
- **THEN** the metadata contains separate `windows-x64` and `windows-ia32` entries whose primary asset filename and URL are identical

### Requirement: Release metadata SHALL expose a stable minimum schema
The release metadata SHALL expose a stable minimum schema containing the release tag, release name, prerelease flag, published timestamp, and a per-target mapping for macOS x64, macOS arm64, Windows x64, and Windows ia32. Each per-target entry MUST include the primary asset filename and download URL.

#### Scenario: Metadata schema is consumed by the website
- **WHEN** the download site reads release metadata
- **THEN** it can resolve the target-specific primary download link using only the documented schema fields

#### Scenario: Metadata omits a required field
- **WHEN** generated metadata is missing any required minimum-schema field
- **THEN** the release validation fails before publication

### Requirement: Latest-release selection SHALL define prerelease behavior
The release contract SHALL define how prerelease builds are marked and whether they are eligible to be treated as the default latest download candidate for downstream consumers.

#### Scenario: Stable release is requested
- **WHEN** a downstream consumer requests the latest stable release
- **THEN** prerelease-tagged releases are excluded from the default result

#### Scenario: Prerelease is explicitly allowed
- **WHEN** a downstream consumer requests the latest release including prereleases
- **THEN** the consumer can select a prerelease using the contract metadata without applying undocumented filtering rules
