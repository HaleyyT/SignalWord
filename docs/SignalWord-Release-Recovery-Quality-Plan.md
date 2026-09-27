> Historical baseline: current scope, implementation status, and open release gates are maintained in [the quality roadmap](implementation/QUALITY_ROADMAP.md). Conflicting scope or readiness claims below are superseded.

# SignalWord Release-Recovery and Quality Plan

## 1. Executive assessment and direction

### Current assessment

- **Planning quality:** 93/100
- **Engineering foundation:** approximately 74/100
- **Release readiness:** **31/100**
- **Release decision:** not ready for TestFlight, App Store, or safety claims.

The repository has strong architecture documents, security boundaries, a hardened viewer foundation, migration discipline, a Swift domain core, secret scanning, and fail-closed release checks. `npm run verify` currently passes 15 Node tests, 8 viewer tests, and the viewer production build. The Swift core verification executable also passes.

The project is behind its intended critical path because Day 4–8 documentation and viewer polish advanced before Day 1–3’s real vertical slice:

`locked phrase → authenticated event → one Resend email → second-device viewer → resolution`

### Immediate quality rule

Freeze new documentation, optional functionality, animation, and visual polish until the complete vertical slice works. Every change must improve one of:

1. Trigger reliability.
2. Duplicate prevention.
3. Delivery truth.
4. Data isolation.
5. Release evidence.

### Locked V1 boundaries

- Public name: **SignalWord**; SafeWord remains only a legacy planning codename.
- iOS 18+, English/Australia launch evidence.
- One confirmed trusted contact.
- Resend email only; SMS is post-release.
- Vocal Shortcuts/App Intent, Siri/App Shortcut, and manual fallback.
- Trigger-time location snapshot, not continuous background tracking.
- No automatic police dispatch.
- No speaker biometrics or app-owned always-on microphone.
- Device-based anonymous Supabase account; no sign-up screen.
- RevenueCat Plus unlocks themes and privacy-safe rehearsal insights only.
- Free users retain every safety capability.
- Offline means durable next-chance retry, never guaranteed immediate delivery.
- Embedded MapLibre is deferred; use timestamped coordinates and an external map link.

Apple documents that Vocal Shortcuts can run a user-trained phrase with audio processed on-device, while `IntentAuthenticationPolicy.alwaysAllowed` permits an App Intent to run while locked. These capabilities must still pass physical-device testing before SignalWord claims them publicly. [Apple Vocal Shortcuts](https://support.apple.com/guide/iphone/use-vocal-shortcuts-iph7f242ea2c/27/ios/27), [App Intent authentication policy](https://developer.apple.com/documentation/appintents/intentauthenticationpolicy?changes=_4).

---

## 2. Release requirements

### Functional requirements

#### FR1 — Frictionless onboarding

- Maximum three conceptual stages: understand, configure, rehearse.
- Explain that iOS—not SignalWord—listens for the phrase.
- Create an anonymous device account and profile.
- Request location only when explaining its value.
- Never request microphone access for app-owned speech recognition.
- Provide concise illustrated Vocal Shortcut instructions.
- A user must be able to reach a useful degraded state when location is denied.

#### FR2 — Trusted-contact consent

- Support exactly one contact name and email.
- Show the complete TEST and REAL message preview.
- Encrypt the destination server-side.
- Send a visibly labeled TEST confirmation email.
- Keep readiness blocked until the recipient confirms.
- Apply destination and user rate limits.
- Replacing a contact revokes the prior confirmation and viewer tokens.

#### FR3 — Readiness and Safety Rehearsal

Display evidence-backed readiness rows for:

- device identity;
- confirmed contact;
- backend reachability;
- Vocal Shortcut setup;
- two successful locked TEST alerts;
- location state;
- last rehearsal timestamp.

The standout onboarding moment is a guided **Safety Rehearsal**: the user locks the phone, says their private phrase, and watches a second device receive a TEST alert. Readiness becomes green only after two successful rehearsals.

#### FR4 — Trigger paths

- Primary: Vocal Shortcut invokes `TriggerAlertIntent`.
- Fallbacks: Siri/App Shortcut and manual hold-to-trigger button.
- Trigger must not open the app or speak private details.
- It must persist the alert command before starting network work.
- It must never wait for RevenueCat, analytics, or a fresh GPS result.

#### FR5 — Exactly-once alert behavior

- Five invocations inside the 60-second cooldown reuse one canonical event.
- Every retry reuses the original idempotency key.
- Client persistence and server transactional deduplication both apply.
- Provider retries reuse a Resend idempotency key derived from event and message type.
- The UI may say “Pending,” “Sent,” or “Delivered” only when evidence supports that state.

Resend supports idempotent sends but retains its keys for 24 hours, so SignalWord’s database remains the long-term source of truth. [Resend idempotency documentation](https://resend.com/changelog/idempotency-keys).

#### FR6 — Offline recovery

- Store a redacted pending command in a shared SQLite database before networking.
- Store no phrase, contact destination, viewer token, or coordinates in the outbox.
- Retry on the next permitted app execution or foreground launch.
- Use bounded backoff and the same idempotency key.
- Show “Waiting for connection” in-app; never claim the contact was reached.
- Do not promise that iOS will perform an immediate background retry.

#### FR7 — Location snapshot

- Create the alert first.
- Attach a cached location when available.
- Attempt one fresher location within a strict three-second budget.
- Store captured time, received time, coordinates, and accuracy.
- Server calculates `live`, `recent`, `stale`, or `unavailable`.
- Approximate and denied states must remain honest.
- Location failure must never fail the alert.

#### FR8 — Delivery and viewer

- Resend adapter sends TEST, REAL, and RESOLVED messages.
- Resend webhook signatures are checked against the raw request body.
- Webhooks update sent, delivered, bounced, or failed states idempotently.
- The viewer exposes exactly one event projection.
- `404/410` means unavailable; `429`, network errors, and `5xx` retry with backoff.
- Abort stale viewer requests and prevent overlapping polling.
- Stop polling terminal expired events; reduce polling for resolved events.
- Serve `Cache-Control: no-store`, CSP, HSTS, and `Referrer-Policy: no-referrer` as HTTP response headers.

#### FR9 — Resolution, retention, and deletion

- Resolution requires a deliberate hold and device authentication.
- It stops location writes and sends one status update.
- Unknown, expired, and revoked public tokens return indistinguishable responses.
- Location and viewer tokens expire no later than 24 hours after resolution or event expiry.
- Delivery diagnostics expire within seven days.
- Contact confirmation tokens expire after 30 minutes and are single-use.
- Delete Data revokes links, cascades owned rows, removes the auth identity, clears Keychain/shared storage, and signs out.

#### FR10 — RevenueCat Plus

- One `plus` entitlement and one offering.
- Plus unlocks themes and aggregate rehearsal insights only.
- Insights contain counts, dates, and latency summaries—not phrases, contacts, tokens, or locations.
- Purchase, cancellation, error, success, and user-initiated restore states are implemented.
- Missing or offline RevenueCat data defaults to the free safety core.
- Restore is invoked only from an explicit user action, consistent with RevenueCat guidance. [RevenueCat restore guidance](https://www.revenuecat.com/docs/getting-started/restoring-purchases).

### Non-functional requirements

#### Reliability

- Twenty concurrent identical requests produce one event and at most one initial email.
- Ten consecutive physical-device E2E runs pass.
- No duplicate email in five rapid phrase invocations.
- Offline recovery survives process termination and device restart after first unlock.
- All P0/P1 fixes receive automated or recorded physical regression coverage.

#### Performance

- Local trigger command persistence: under 500 ms.
- Alert API target: p95 under three seconds over 20 production-like trials.
- Provider acceptance target: p95 under five seconds; actual delivery latency is measured separately.
- Viewer usable content: under 2.5 seconds on typical mobile connectivity.
- Alert creation never waits for location or RevenueCat.

#### Security and privacy

- Mobile code uses a publishable Supabase key plus the user JWT; no secret/service key ships in the app.
- User Edge Functions require JWT authentication and execute with caller-scoped RLS where possible. [Supabase function authentication](https://supabase.com/docs/guides/functions/auth).
- Anonymous Supabase users receive the authenticated role, so behavioral cross-user RLS testing is mandatory. [Supabase anonymous authentication](https://supabase.com/docs/guides/auth/auth-anonymous).
- Contact destination uses AES-GCM encryption with key versioning.
- Destination deduplication uses keyed HMAC, not an unsalted hash.
- Viewer and confirmation tokens use at least 256 random bits and store only SHA-256 hashes.
- No phrase, transcript, JWT, destination, token, or precise location appears in logs or analytics.
- Dependency, secret, authorization, abuse, and hosted-header tests are release gates.

#### Accessibility and UX

- WCAG 2.2 AA for the viewer.
- VoiceOver labels, Dynamic Type XXXL, dark mode, Reduce Motion, and 44-point targets on iOS.
- Minimum supported viewer width: 320 px.
- TEST and REAL alerts cannot be confused by colour alone.
- Calm language; no fear marketing, fabricated confidence, or guaranteed-rescue wording.
- At least four of five external users complete setup without developer assistance.

#### Maintainability and operations

- Domain, persistence, networking, location, provider, and RevenueCat boundaries remain protocol-driven.
- Critical alert/backend modules maintain at least 85% line coverage.
- CI includes Node/viewer, Deno functions, pgTAP, secret scan, and unsigned iOS simulator build/test jobs.
- Every production request receives a request ID.
- Operational logs use an explicit field allowlist.
- Provider and public-viewer functions have kill switches.
- Development/test and production remain the only environments.

---

## 3. Architecture and interface corrections

### iOS

Replace `UserDefaultsActiveAlertStore` with an App-Group SQLite repository:

```text
pending_alerts(
  idempotency_key primary key,
  kind,
  trigger_method,
  created_at,
  state,
  retry_count,
  next_attempt_at,
  canonical_event_id nullable
)
```

`BEGIN IMMEDIATE` must atomically return an existing recent command or create one. A singleton composition root shares the coordinator instead of creating a new coordinator per intent invocation.

Define:

```text
AlertCommand
- idempotencyKey
- kind
- triggerMethod
- clientTriggeredAt

TriggerOutcome
- created(eventId)
- reused(eventId)
- queuedOffline
- rejected(reason)
- failedRetryable
```

The App Intent must not discard the outcome. It remains verbally silent but persists an inspectable local state and schedules retry when appropriate.

Use a dedicated URLSession with:

- eight-second alert timeout;
- three-second location timeout;
- ephemeral cache policy;
- cancellation support;
- `Retry-After` handling;
- retryable mapping for network, `429`, `502`, `503`, and `504`.

### Backend functions

Implement five deployment units:

1. `user-api`: authenticated contacts, alerts, location, status, resolve, and delete-data routes.
2. `contact-confirm`: public single-use confirmation token.
3. `public-event`: public viewer-token projection.
4. `dispatch-deliveries`: secret-authenticated immediate/cron delivery worker.
5. `resend-webhook`: public route with mandatory signature verification.

Maintain the existing `/v1` external contract through routing/rewrites. `Idempotency-Key` remains a header only; remove it from the encoded request body.

`POST /v1/alerts` must use one database transaction:

1. Authenticate the user.
2. Acquire a per-user transaction advisory lock.
3. Require a confirmed contact belonging to that user.
4. Reuse the same idempotency key or recent cooldown event.
5. Generate a 32-byte viewer token and store only its hash.
6. Insert the event and queued delivery.
7. Commit.
8. Trigger the delivery dispatcher.
9. Return the canonical event and honest delivery state.

### Database corrections

- Add a composite relationship ensuring an alert’s contact belongs to the same user.
- Replace `unique nulls not distinct(provider, provider_message_id)` with a partial unique index applying only when `provider_message_id IS NOT NULL`; the current constraint can prevent multiple queued deliveries with null provider IDs.
- Add hashed, expiring, single-use contact confirmation tokens.
- Add persistent rate-limit buckets and delivery retry scheduling.
- Tighten state/timestamp constraints so unresolved events cannot carry resolved timestamps.
- Define active-event expiry and resolution-based retention consistently.
- Schedule hourly retention through Supabase Cron and verify job execution. [Supabase Cron](https://supabase.com/docs/guides/cron).
- Expand pgTAP from structural checks to actual user A/user B reads and writes, service-boundary tests, token expiry, retention, and cascade deletion.

### Provider behavior

- Resend keys:
  - `alert/<eventId>/initial`
  - `alert/<eventId>/resolved`
  - `contact/<contactId>/verification/<tokenId>`
- Delivery retry schedule: immediate, one minute, five minutes, fifteen minutes; stop after four attempts and report failed.
- Verify raw webhook payload signatures before parsing. [Resend webhook verification](https://resend.com/changelog/managing-webhooks-via-api).
- Never treat provider acceptance as inbox delivery.

---

## 4. Eight-day recovery schedule

Each day contains approximately 4.5–5 planned hours and at least one hour of contingency. Autonomous implementation pauses only at physical-device, provider, security, purchase, and release gates.

### Day 1 — 23 September: restore trustworthy foundations

- Fix Docker Desktop folder sharing and make `npm run test:db` pass locally.
- Correct the delivery uniqueness, user/contact ownership, token, and retention schema defects.
- Expand pgTAP with real authenticated user A/user B behavior.
- Push the two local commits currently ahead of `origin/main`.
- Confirm the new database CI job passes remotely.
- Correct stale evidence counts in the Day-8 audit.

**DoD:** local release preflight is green; remote baseline, database, and secret-scan jobs are green; no schema P0/P1 remains.

### Day 2 — 24 September: backend walking skeleton

- Implement shared validation, error envelopes, safe logging, token utilities, and rate limits.
- Build `user-api`, `public-event`, and fake delivery adapter.
- Implement transactional create/reuse alert.
- Add concurrency, auth, token, and public-projection integration tests.
- Connect the existing viewer to the local public API.

**DoD:** one authenticated local request creates one event, one queued fake delivery, and one valid viewer; twenty identical concurrent requests still create one event/delivery.

### Day 3 — 25 September: confirmed contact and real Resend delivery

- Verify the Resend sending domain.
- Implement contact encryption/fingerprint and confirmation-token flow.
- Add confirmation and delivery email templates with unmistakable TEST copy.
- Implement dispatcher and signed webhook processing.
- Fix viewer transient-error handling, aborts, terminal polling, and hosted headers.
- Test from a second physical device/private browser.

**DoD:** a new contact receives and confirms a TEST email; one REAL test reaches the second device; provider and database records reconcile; invalid webhook signatures fail.

### Day 4 — 26 September: signed iOS application and manual E2E

- Create the real iOS app project and targets.
- Add anonymous Supabase identity/session lifecycle.
- Store refreshable credentials in device-only Keychain.
- Add App-Group SQLite alert repository and composition root.
- Implement onboarding shell, contact setup, readiness, manual trigger, and status.
- Add a macOS CI job for simulator build and XCTest.

**DoD:** clean signed install on the physical iPhone completes setup and produces a manual alert, real email, and viewer without developer database intervention.

### Day 5 — 27 September: hero locked-trigger proof

- Register App Intent/App Shortcut in the actual target.
- Wire the production coordinator and durable outbox.
- Add trigger snapshot location.
- Test foreground, background, locked, force-quit, reboot, location denied, Low Power Mode, Wi-Fi, cellular, and airplane mode.
- Test five rapid invocations and offline recovery.
- Apply the predetermined Siri/Action/manual pivot if locked Vocal Shortcuts fail after 90 focused minutes.

**DoD:** locked phrase produces exactly one second-device alert and honest location on the release device, or all public wording is narrowed to the proven fallback. The capability matrix has no unknown rows.

### Day 6 — 28 September: complete product lifecycle and monetization

- Implement active status, authenticated hold-to-resolve, resolved notification, and expiry.
- Implement complete delete-data flow.
- Configure RevenueCat `plus`, purchase, cancellation, error, and restore.
- Add themes and aggregate rehearsal insights.
- Verify RevenueCat outage cannot affect any alert transition.
- Upload the first viable App Store candidate as soon as this gate passes.

**DoD:** fresh install → contact confirmation → locked/manual alert → viewer → resolve → delete works; purchase and restore work; the same alert path passes with RevenueCat unavailable.

### Day 7 — 29 September: big-tech UX and adversarial QA

- Finish the three-stage onboarding and Safety Rehearsal.
- Add the evidence-backed readiness screen and calm Signal Halo state treatment.
- Complete VoiceOver, Dynamic Type, contrast, dark-mode, and Reduce Motion checks.
- Run five unassisted setup sessions and revise only observed P0/P1/P2 issues.
- Execute token abuse, cross-user, wrong-clock, provider failure, malformed payload, and log-redaction tests.

**DoD:** four of five testers complete setup unaided and correctly explain the alert, recipient, location freshness, and limitations; no security or accessibility P0/P1 remains.

### Day 8 — 30 September: release evidence and submission

- Run ten consecutive complete E2E trials.
- Complete 50 controlled phrase trials.
- Run five uninterrupted demo rehearsals.
- Deploy production Supabase functions/migrations and Vercel viewer.
- Verify HTTPS and all response security headers.
- Perform clean TestFlight/public-build smoke test.
- Reconcile App Store, privacy, support, demo, claims ledger, and Devpost wording.
- Record build, commit, CI links, provider evidence, store URL, video URL, and submission receipt.

**DoD:** every release checklist row is evidenced; no P0/P1 remains; public claims match observed behavior; a public store build and verified submission artifacts exist.

---

## 5. Verification and final release DoD

### Mandatory automated suites

- XCTest: coordinator concurrency, stable idempotency, SQLite recovery, API mapping, location freshness, Keychain abstraction, state machine, deletion, RevenueCat fallback.
- Deno/unit: validation, token hashing, encryption, rate limiting, provider mapping, webhook verification, redacted logging.
- pgTAP/integration: RLS user isolation, contact ownership, idempotency, concurrency, retention, cascade deletion, token expiry/revocation.
- Viewer: status classification, runtime projection validation, polling cancellation, retry/backoff, accessibility, responsive rendering, expired-token cache behavior.
- Contract: fixtures decoded by actual Swift, backend, and viewer implementations—not validated independently.
- CI: Node/viewer, Deno, database, iOS simulator, secret scan, dependency audit.

### Mandatory failure scenarios

- No network at trigger.
- Network lost after server commit but before client response.
- Provider accepts email but webhook is delayed.
- Provider returns `429` or `5xx`.
- Expired JWT requiring session refresh.
- Five simultaneous trigger invocations.
- Wrong device clock.
- Location precise, approximate, stale, denied, and unavailable.
- App terminated after command persistence.
- Invalid, expired, revoked, and cross-event viewer tokens.
- RevenueCat unavailable during trigger.
- Delete-data interrupted and retried.

### Final product DoD

SignalWord ships only when:

- A non-developer can configure it without coaching.
- The released build performs the hero locked-phrase flow on a physical iPhone.
- Exactly one canonical event and initial email result from repeated triggers.
- The recipient understands who triggered, when, how fresh the location is, and what to do.
- Offline, provider, and location failures are represented honestly.
- User A cannot access user B’s contact, event, delivery, or location.
- Viewer tokens expire/revoke and never appear in browser storage, analytics, logs, or referrers.
- Purchase and restore work, while the complete safety core works without Plus or RevenueCat.
- Delete Data removes both local and server-controlled data and invalidates prior links.
- Ten E2E runs, 50 phrase trials, five demo rehearsals, hosted security checks, and CI are green.
- No P0/P1 defect is open.
- No public wording claims police dispatch, worldwide support, speaker recognition, guaranteed delivery, or guaranteed rescue.

### Assumptions

- Physical iPhone, Apple Developer membership, App Store Connect, and RevenueCat access are available.
- A Resend account and sender domain can be verified immediately.
- SignalWord is the final product name.
- Standard App Store eligibility remains the primary submission route.
- Initial evidence applies to en-AU and tested Australian networks/devices, not worldwide coverage.
- The managed Devpost build workflow is not initialized in this repository; this plan uses the repository’s existing authoritative PRD/specification documents.
- The risk-first sequencing and explicit verification gates are deliberate: no later-stage polish is accepted before the earlier safety-critical gate passes.
