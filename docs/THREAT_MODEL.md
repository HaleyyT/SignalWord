# SignalWord V1 Threat Model

## Security goals

1. Only the configured user/device can create alerts for that profile.
2. A leaked viewer URL reveals only one bounded event for a limited time.
3. Repeated vocal triggers cannot create an alert storm or message charges.
4. SafeWord never receives the trained phrase audio or transcript.
5. One user cannot access another user’s contact, event, or location.
6. Logs and analytics cannot reconstruct a person’s movements or contact destination.
7. Failure is reported honestly; no UI claims police/contact delivery without evidence.

## Protected assets

- precise and historical location;
- contact name/destination;
- anonymous user/session credentials;
- viewer and confirmation tokens;
- alert status and timestamps;
- purchase identity/entitlement;
- the fact that a person uses a safety app.

The trained phrase is protected by iOS Vocal Shortcuts and is intentionally outside SafeWord’s data boundary.

## Adversaries and misuse

- someone who obtains a viewer link;
- another app/user attempting to call backend endpoints;
- a person who learns or accidentally says the vocal phrase;
- automated abuse of test alerts or delivery providers;
- a coercive person trying to resolve/revoke the event;
- an insider or developer viewing logs;
- a network attacker;
- accidental disclosure through screenshots, analytics, browser referrers, or crash reports.

## Threats and controls

| Threat | Control | Verification |
|---|---|---|
| Viewer link leaks | 256-bit opaque token, hash at rest, TLS, short expiry, revoke, one-event projection, strict client token-route validation, no-store/no-referrer policy | Attempt reuse after expiry/revocation; inspect headers and logs |
| Cross-user database access | RLS deny by default, owner policies, privileged work only in Edge Functions | Automated user A/user B policy tests |
| Alert storm | Client cooldown, server rate limit, unique idempotency constraint, provider deduplication | 20 concurrent identical requests yield one event/delivery |
| Attacker says known phrase | Phrase is user-selected and OS-trained; alert action exposes no secrets; event is a notification, not a destructive action | Document limitation; test household speech false activations |
| Phrase mistaken for voice biometrics | No speaker-identity copy or logic | Content audit and App Store metadata review |
| Coercer resolves event | Hold + device authentication for in-app resolution; original message remains; contact sees resolved timestamp | Attempt resolve while locked and without auth |
| Stolen device invokes intent | Alert goes only to preconfirmed contact and reveals nothing to invoker; rate limits apply | Locked-device misuse test |
| Device clock is wrong | Server timestamps determine event order, expiry, and freshness | Set device clock wrong and run E2E |
| Network lost at trigger | Local redacted outbox + same idempotency key; UI never claims delivery | Airplane-mode test and recovery |
| App is force-quit | Day-1 intent test; if unsupported, disclose and use system fallback | Physical device matrix |
| Location permission denied | Alert still sends; viewer says unavailable | Denied-permission E2E |
| Old location appears live | Include captured/received timestamps; server freshness enum | Inject stale sample test |
| Provider callback spoof | Verify provider signature; allowlist event transitions | Invalid signature tests |
| Contact destination leaks in logs | Structured allowlist logging and redaction | Automated log snapshot test/manual grep |
| Precise coordinates leak in analytics | No precise-location events; aggregate latency only | Analytics payload inspection |
| Token leaks through browser | No third-party analytics on viewer, restrictive referrer policy, content security policy, no URL token in client logs, token not copied into query strings | Browser network/storage inspection and hosted-header check |
| Service key ships in app | Only public client key in app; service role in server secret store | Secret scan and binary/config review |
| Contact spam/harassment | Confirmation flow, previewed content, per-user/destination/IP rate limits, abuse contact | Abuse-case integration tests |
| Sender mints their own consent | Backend-only contact creation; API generates tokens and binds the verified caller identity; recipient capability required | Direct authenticated RPC denied; backend creation and actual recipient confirmation tested |
| Oversized webhook upload | Bound raw bytes while streaming before signature verification and parsing | Oversized chunked upload is cancelled with 413; altered/stale signatures rejected |
| Automated anonymous signup | CAPTCHA-compatible onboarding, hosted signup limits and quota monitoring required before public enrollment | Not yet complete; see public-launch security gates |
| Data persists forever | DB expiry columns, scheduled deletion, deletion endpoint | Time-shifted retention tests |

## Locked App Intent security decision

The trigger intent is allowed to run while locked because requiring Face ID would defeat the core use case. Its authority is deliberately limited to creating/reusing an alert for an already configured, confirmed contact.

It cannot:

- read or return contact details;
- display history or viewer URLs;
- modify the contact;
- change retention, purchase, or privacy settings;
- resolve an event;
- dispatch police/emergency services;
- export stored data.

## Emergency-services boundary

Automatically sending data to a nearby police station is out of scope. Map search results are not a dispatch network, coverage and legal duties vary by jurisdiction, and Apple’s review guidance warns against representing location APIs as emergency services.

A future integration requires:

- a contracted/authorized emergency-response partner;
- documented jurisdictions and hours of coverage;
- verified routing and acknowledgment semantics;
- incident monitoring and escalation operations;
- consent, privacy, retention, and deletion review;
- clear failure and fallback behavior;
- legal and App Review assessment.

Until all are true, only confirmed trusted contacts receive automated alerts.

## Retention

- Location samples: expire 24 hours after resolution or event expiry.
- Viewer token: expire no later than 24 hours after resolution; user may revoke immediately.
- Contact confirmation tokens: 30-minute acceptance window and single-use confirmation; consumed capabilities remain available for withdrawal until replacement or account deletion.
- Redacted delivery diagnostics: at most seven days.
- Aggregate reliability metrics: no precise coordinates, phrases, contacts, or tokens.
- Account deletion: revoke immediately and delete user-controlled data as soon as operationally possible.

## Incident response minimum

1. Disable the affected provider/function through a documented feature flag.
2. Revoke exposed viewer tokens.
3. Preserve redacted audit evidence.
4. Determine affected users/events without widening access.
5. Notify users/regulators when legally required.
6. Patch, test the abuse path, rotate secrets, and document the decision.

## Pre-release security gate

- RLS tests pass for every table.
- No service role/provider secret is present in app/web bundles or Git history.
- Public viewer returns only the allowlisted projection.
- Public viewer security audit passes: no browser storage/logging/server-credential references, a no-referrer policy, and restrictive CSP metadata.
- Concurrent idempotency test proves one event and one delivery.
- Expired/revoked token tests pass.
- Logs contain no phrase, transcript, destination, viewer token, JWT, or precise coordinate.
- Delete-data flow is verified end to end.
- Reviewer notes accurately state who is—and is not—contacted.

## Current verified baseline and release caveat

The development database has 12 application tables with RLS enabled. Live profile isolation, tampered-token rejection, webhook rejection and an authorized email TEST lifecycle have been verified. The public viewer rebuilds only its allowlisted event projection; hosted routing/privacy-header checks pass. These are specific checks, not a guarantee against all attacks. See [deployment evidence](implementation/DEVELOPMENT_DEPLOYMENT_STATUS.md) and [remaining public-launch security gates](implementation/PUBLIC_LAUNCH_SECURITY.md). The threat/control table contains intended controls as well as implemented ones; unverified IP limits, CAPTCHA, device recovery, restore protection and monitoring must not be treated as complete.
