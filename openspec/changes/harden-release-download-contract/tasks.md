## 1. Define the release contract

- [x] 1.1 Audit the actual `electron-builder` output names for macOS x64, macOS arm64, Windows x64, and Windows ia32
- [x] 1.2 Encode the canonical target-to-asset mapping and prerelease policy in a repository-local contract module or script
- [x] 1.3 Define how each supported target chooses its single primary download asset when multiple artifacts exist, including the shared Windows installer rule
- [x] 1.4 Align `electron/package.json` packaging expectations with the documented four-target contract

## 2. Enforce the contract in the release workflow

- [x] 2.1 Add a workflow helper that validates required assets and rejects missing or ambiguous names
- [x] 2.2 Update `.github/workflows/release.yml` to run validation before publishing the GitHub Release
- [x] 2.3 Generate stable machine-readable release metadata from the validated asset set
- [x] 2.4 Enforce the minimum metadata schema fields required by downstream consumers

## 3. Verify contract behavior

- [x] 3.1 Add automated tests or fixture-based checks for target mapping, metadata generation, and prerelease filtering
- [x] 3.2 Add automated checks for primary asset selection and required metadata schema fields
- [x] 3.3 Verify the contract distinguishes Windows x64 from Windows ia32 and macOS x64 from macOS arm64
- [x] 3.4 Run the local verification commands relevant to the new contract helpers and record any limitations

## 4. Align documentation

- [x] 4.1 Update `docs/BUILD.md` to document the enforced output contract and Windows ia32 support
- [x] 4.2 Update `docs/RELEASE.md` to match the workflow-driven release flow and latest/prerelease policy
- [x] 4.3 Update `openspec/launch-roadmap.md` status notes if the new contract changes roadmap execution visibility
