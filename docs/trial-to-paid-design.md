# Pyramid Notes Trial-to-Paid Design

## Purpose

This document defines the first commercial model for Pyramid Notes when the product is still in Alpha and does not yet have enough feature depth to split into a convincing free tier and Pro tier.

The recommended model is:

- one product
- full functionality during trial
- paid unlock after trial expiry
- one-time license first, subscription later only when real ongoing services exist

This document is intended to be implementation-ready for future reads.

## Product decision

### Chosen model

- `Trial`: full app access for a limited period
- `Paid`: full app access after license activation

### Explicit non-goals for v1

- no permanent free tier
- no feature-based Pro split
- no subscription in the first release
- no cloud account system as a prerequisite for launch
- no App Store / Mac App Store dependency for the first commercial test

## Why this model fits the current product

Current Pyramid Notes is still validating whether users care enough about the core workflow:

- browse a visible tree
- open a node into full Markdown
- return to structure
- search by name or note content

At this stage, forcing an artificial free/Pro feature split would create a weak paywall because the product does not yet have enough mature premium-only surface area.

The cleaner early model is:

- let users experience the real product
- give them enough time to test one meaningful workflow
- ask for payment only if they want to continue using the whole app

## Commercial package

### Trial

Recommended default:

- `14 days`
- starts on first successful launch
- all features available

Why 14 days:

- 7 days is often too short for a structured note workflow
- 14 days is long enough for one course, research, or technical note scenario
- 30 days is too long for early validation and weakens urgency

### Paid

Recommended launch model:

- one-time license
- early-bird price first
- later move to standard price

Suggested ranges:

- China early-bird: `RMB 39-69`
- China standard: `RMB 79-149`
- Global early-bird: `USD 9-19`
- Global standard: `USD 19-39`

## User-facing states

The app should have four business states.

### 1. Active trial

Conditions:

- no paid license
- trial start exists
- current time is before expiry

Behavior:

- full access
- settings shows remaining trial days
- low-pressure reminder near expiry

### 2. Trial expired

Conditions:

- no paid license
- current time is after expiry

Behavior:

- block normal editing workflow behind a paywall screen
- allow access to purchase / activation flow
- optionally allow read-only data export in a later iteration, but not required for v1

### 3. Paid active

Conditions:

- valid activated license

Behavior:

- full access
- no trial messaging

### 4. Grace / offline verification hold

Conditions:

- license was valid before
- network verification cannot currently complete

Behavior:

- continue access for a defined grace window
- retry verification later

Recommended grace window:

- `14-30 days`

## What should happen at expiry

Recommended v1 behavior:

- show a full-screen blocking paywall on startup
- disable create, edit, and save flows
- keep purchase and activation available

Avoid for v1:

- silently deleting data
- hiding files
- locking users out with no explanation
- aggressive repeated modal spam during an active trial

Suggested user promise:

> Your local notes remain yours. Trial expiry only blocks continued use of the app until a license is activated.

## License model

### Recommended first version

- license key based
- optional email binding in backend records
- local cached activation state
- remote verification on activation
- occasional background re-check later

### Why not accounts first

An account system adds:

- password reset
- session management
- auth UI
- backend security burden
- support overhead

That is too much for the first paid validation.

License keys are enough to test willingness to pay.

## Minimal system design

### Local state

Store a local commercial state object in app settings.

Suggested shape:

```json
{
  "commercial": {
    "trialStartedAt": "2026-07-15T08:00:00.000Z",
    "trialExpiresAt": "2026-07-29T08:00:00.000Z",
    "licenseKey": null,
    "licenseStatus": "trial_active",
    "licenseActivatedAt": null,
    "lastVerifiedAt": null,
    "graceExpiresAt": null
  }
}
```

Suggested statuses:

- `trial_active`
- `trial_expired`
- `paid_active`
- `grace_active`
- `invalid`

### Renderer responsibilities

- read commercial state on boot
- decide whether to enter normal app or paywall
- show trial countdown in settings or top-level status area
- route activation form submission to main process

### Main process responsibilities

- own secure-ish local persistence of commercial state
- perform activation request
- perform background license verification
- expose IPC for trial status and activation actions

### Backend responsibilities

Minimal backend for v1:

- create license keys
- store purchase record
- store activation count
- return activation result
- support revocation if necessary

Not required for v1:

- full customer portal
- self-serve device management
- subscription billing
- invoice automation beyond manual confirmation

## Activation flow

### Purchase flow

1. User clicks purchase link from website or expired-trial screen.
2. Payment happens outside the app.
3. User receives license key by email or manual fulfillment.
4. User opens activation screen in app.
5. User enters license key.
6. App verifies key with backend.
7. On success, local state becomes `paid_active`.

### First launch flow

1. App starts.
2. If no commercial state exists, create a trial record.
3. Compute remaining time.
4. If still active, let user continue.
5. If expired, route to paywall screen.

### Reactivation flow

1. App starts while local paid state exists.
2. If recent verification is still valid, continue.
3. If verification is stale and network is available, re-check in background.
4. If re-check fails for transient reasons, enter grace state.
5. If backend says the key is invalid or revoked, move to blocked paid state and explain why.

## Website implications

The website should match this model exactly.

Recommended launch copy:

- `14-day free trial`
- `Full app during trial`
- `One-time purchase after trial`
- `Alpha: feedback welcome`

Do not claim:

- subscription
- cloud sync
- team plan
- mobile access

unless those capabilities actually exist.

## Success metrics

The first commercial loop should measure whether the core workflow is worth paying for.

Track at least:

- download count
- install-to-first-launch count
- trial start count
- day 3 active trial users
- day 7 active trial users
- day 14 conversion rate
- activation success rate
- top 5 objections from non-buyers

Recommended first benchmark set:

- trial start rate from download page
- trial completion rate
- paid conversion rate after expiry
- percentage of feedback coming from real usage rather than casual impressions

## Risks

### Risk: users dislike paywalling the whole app

Response:

- keep trial long enough to be fair
- be explicit before download that the app is trial-first
- do not pretend there is a permanent free tier

### Risk: license system feels too weak

Response:

- that is acceptable for v1
- the goal is validation, not perfect anti-piracy

### Risk: backend overhead

Response:

- keep backend intentionally small
- only add accounts or subscriptions after paid demand exists

## Recommended implementation order

1. Add commercial state to settings storage.
2. Add trial clock creation on first launch.
3. Add trial expiry checks on startup.
4. Add paywall screen in renderer.
5. Add activation screen and IPC contract.
6. Add minimal license backend.
7. Add website copy for trial and purchase.
8. Add analytics or lightweight event logging for funnel metrics.

## Open decisions for later

- exact trial length: `7` or `14` days
- whether expired users get read-only access
- whether one purchase includes lifetime updates or one year of updates
- whether one key supports one device or multiple personal devices
- whether China and global pricing should differ at launch

## Current recommendation

For Pyramid Notes in its current Alpha stage, the default recommendation is:

- `14-day full trial`
- `one-time paid unlock`
- `license key activation`
- `no permanent free tier`
- `no subscription until sync or other ongoing service exists`
