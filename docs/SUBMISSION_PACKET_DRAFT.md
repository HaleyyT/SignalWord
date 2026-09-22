# SignalWord submission packet draft

This is a project-owned drafting packet, not a submitted Devpost form. Populate only fields supported by final release evidence and official event requirements.

## Project identity

- **Title:** SignalWord
- **One-line summary:** A privacy-first iOS safety-coordination prototype for sending one honest test alert to one confirmed trusted contact.
- **Repository:** `https://github.com/HaleyyT/SignalWord`
- **Public demo video:** Pending recorded, publicly playable evidence.
- **Public store URL:** Pending App Review/public release evidence.

## Problem

In a stressful moment, a person may need a trusted contact to receive a concise signal without relying on an app-owned always-listening microphone or a misleading emergency-dispatch promise.

## Proposed solution

SignalWord is designed around an iOS-owned Vocal Shortcut that invokes a narrow alert intent. The intended flow creates one idempotent alert event, shares the latest available location through a scoped expiring viewer link, and gives the recipient honest status language. It deliberately does not claim police dispatch, guaranteed recipient delivery, speaker identity, worldwide coverage, or universal offline operation.

## What is implemented in this repository

- Swift alert-domain models, cooldown/idempotency coordination, retry classification, redacted outbox contract, and a narrow App Intent source spike.
- A protected Supabase schema/migration with RLS policy and static schema checks.
- A React trusted-contact viewer with token-route validation, polling/backoff behavior, location-freshness labels, privacy/support pages, and accessibility-focused link/status treatment.
- CI, contract fixtures, release preflight, privacy/security review runbooks, reliability-study protocol, and release evidence templates.

## Verification evidence available today

- Swift core verification passes on Xcode 27.
- Repository, contract, schema-static, and viewer tests pass; the viewer production build passes.
- Full Xcode preflight passes.

## Evidence still required before public claims or submission

- A healthy local/production Supabase run with real RLS and migration evidence.
- Physical locked-device, force-quit, reboot, permission, offline, and Low Power Mode results.
- Confirmed trusted-contact delivery, viewer/resolution E2E runs, and deletion/revocation checks.
- Controlled 50-trial reliability study, five filmed-flow rehearsals, public privacy/support URLs, and public video/store evidence.

## Technology

Swift, Swift Concurrency, App Intents, React, TypeScript, Vite, Vitest, Supabase/Postgres RLS, GitHub Actions, and Docker-based local Supabase tooling.

## Award narrative inputs

### Safety and privacy

The primary design decision is a boundary: system-owned phrase recognition rather than hidden ambient listening, and trusted-contact coordination rather than unsupported emergency dispatch. Publish this only alongside completed device, backend, and privacy evidence.

### Design

The contact viewer prioritizes clear active/resolved state, location freshness, large touch targets, readable focus treatment, and Reduce Motion behavior. Add only observed usability findings and their fixes.

### Build in public

Pending genuine public artifacts. Include actual links describing architectural decisions, limitations, tests, and user-led improvements; do not create retrospective or promotional claims.

## Assets to attach after verification

- A 1024×1024 app icon.
- At least one 1179×2556 screenshot without a device frame, using fictional data.
- A 90–115 second public video following `docs/DEMO_PRODUCTION_RUNBOOK.md`.
- Redacted evidence summaries and any award-specific responses required by the official form.
