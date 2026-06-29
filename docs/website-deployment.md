# Pyramid Notes Website Deployment

## Scope

This document covers the bilingual download site under `website/` and its GitHub Pages deployment path. It does not modify GitHub Releases, Cloudflare, or custom-domain control planes automatically.

## Local workflow

```bash
pnpm --filter website run dev
```

```bash
pnpm --filter website run test
```

```bash
pnpm --filter website run build
```

The site expects `website/public/release-metadata.json` to exist. During local work, the checked-in snapshot is enough for UI verification. In GitHub Pages CI, the workflow tries to refresh that file from the latest public release before building.

## GitHub Pages workflow

`.github/workflows/pages.yml` performs:

1. Workspace install
2. `website/scripts/sync-release-metadata.mjs`
3. `pnpm --filter website run build`
4. Upload of `website/dist`
5. Deploy to GitHub Pages

Only the static site output is uploaded. Desktop binaries stay in GitHub Releases and are never copied into the Pages artifact.

## Base path behavior

The site reads `SITE_BASE_PATH` from the build environment and passes it into Vite's `base` option.

- GitHub Pages project path example: `/pyramidNotes/`
- Future custom domain example: `/`

All localized links and asset references must continue to work under both modes.

## Cloudflare and custom domain follow-up

Manual steps only:

1. Add the GitHub Pages custom domain in repository settings after Pages output is stable.
2. Point the desired domain or subdomain at GitHub Pages using Cloudflare DNS.
3. Configure Cloudflare cache rules carefully so `release-metadata.json` is not held stale for too long.
4. Rebuild the site with the appropriate `SITE_BASE_PATH=/` once the custom domain is active.

Suggested cache posture:

- HTML: short cache or revalidate aggressively
- `release-metadata.json`: short cache
- static hashed assets: long cache

## Operational note

The current public channel is prerelease-first. `website/scripts/sync-release-metadata.mjs` therefore prefers the newest non-draft release, including `alpha`, `beta`, and `rc`, unless `SITE_RELEASE_CHANNEL=stable` is set explicitly.
