# Step 2 repairs and verification — 27 September 2026

## Current conclusion

The repairs below improve the locally verified implementation. **Step 2 is still
not a production sign-off.** No hosted environment, provider account, or physical
phone was verified in this work. Independent restore protection and production
crash reporting still require implementation and operational evidence.

The working tree already contained the previous Step 2 repairs and an in-progress
UI redesign. This work extends those changes rather than reverting them.

## What happened, what changed, and why

### 1. A lost send response could leave delivery permanently uncertain

The previous repair correctly stopped blind resends, but it did not provide a way
to attach a later provider callback when the worker had never received a message ID.

Each new Resend send now includes `signalword_delivery`, a SHA-256 hash of its
original idempotency key. Resend includes tags in signed callbacks. After checking
the signature, the webhook records the immutable receipt and links it to the
attempted delivery. The tag contains no email address, viewer token, or location.

The database handles callbacks before worker completion, unknown outcomes, duplicate
receipts, conflicting replay data, and late callbacks after a bounce. A late worker
failure cannot replace a successful reconciliation. Canceled work is not revived.
Provider acceptance remains distinct from terminal delivery: a `sent` row keeps its
completion timestamp empty until a terminal report arrives.

A valid webhook that cannot reach the database now returns **503**, allowing retry,
instead of incorrectly classifying a storage outage as an invalid payload. The
webhook database call has a five-second timeout.

**Boundary:** old sends without the new tag and attempts with no callback remain
unknown. They must not be blindly resent or counted as delivered. Resend’s tags are
documented in [Managing Tags](https://resend.com/docs/dashboard/emails/tags) and
[the sent callback reference](https://resend.com/docs/webhooks/emails/sent).

### 2. The redesigned dashboard hid a valid manual fallback

The dashboard required complete vocal setup before showing the manual REAL control.
It now shows that control when the device identity and contact are ready, regardless
of rehearsal completion or location permission. The deliberate hold action remains.

An authoritative missing contact now clears cached contact readiness. Deletion
clears the recovered-alert list and stale resolution messages. Rehearsal evidence
is scoped to a contact and cleared on replacement, resend, or withdrawal. Periodic
recovery does not erase an unfinished contact form.

### 3. Source checks did not prove the application journey

A real XCUITest target and shared Xcode scheme now exercise the app screens:

1. Enter sender and contact details.
2. Reach the dashboard without claiming vocal or location readiness.
3. Trigger manually.
4. Terminate and relaunch the app.
5. Recover and resolve the active alert.
6. Delete the account, relaunch, and verify the setup screen returns.
7. In a separate journey, withdraw a contact and verify manual triggering disappears.

The simulator service fixture persists across app termination. It is compiled only
for **Debug simulator builds**, cannot send email, and cannot replace production
services on a physical phone or in a Release build. This proves screen integration
and model recovery behavior, not the live HTTP/auth/provider chain. Device-owner
authentication is simulated in this fixture; physical authentication remains a gate.

Run on a Mac with an installed iPhone simulator:

```bash
npm run test:ios:ui
```

The script prints an artifact directory containing the `.xcresult` evidence. CI
runs the same journeys. Local simulator test runners need ad-hoc signing; simply
building an unsigned simulator binary does not establish that UI tests can launch.

### 4. Authenticated response contracts were incomplete

Every authenticated success route now validates and allowlists its response fields:
profile, alert creation, contact read/write/disable, alert status/recovery, location
acceptance, resolution, and deletion. Invalid upstream results become a retryable
503 without exposing their content. Unexpected database fields are excluded.

Shared lifecycle fixtures are checked by the backend validation and decoded using
the actual Swift wire models. Tests cover unknown delivery state, fractional server
timestamps, acknowledgement, and recovery arrays. Public viewer projection tests
and existing input validation remain in place. This is runtime contract protection;
it is not a claim that an exhaustive versioned OpenAPI specification is finished.

### 5. Hosted configuration had no reproducible smoke check

The previous routing rewrite is retained. The hosting configuration now adds HSTS
and a Content Security Policy restricting resources to the app and preventing framing.

The new command checks deep links, event GET, acknowledgement POST, confirmation,
withdrawal, unavailable-link JSON, and privacy headers:

```bash
SIGNALWORD_VIEWER_ORIGIN=https://YOUR_DEVELOPMENT_VIEWER npm run release:hosted
```

It generates an unissued random capability, never prints it, and sends no alerts.
A SPA HTML fallback at an API URL fails the check. Passing this command still does
not prove delivery or acknowledgement of an actual TEST event.

### 6. Operational health was not connected to an operator check

A service-role-only RPC now reports aggregate alert/contact queues, unknown outcomes,
expired leases, dispatch configuration presence, and the last successful execution
of required schedules. It returns no secret values, recipients, tokens, or locations.

`npm run monitor:operations` checks this evidence and posts safe problem codes to a
configured operator webhook on failure. Database or notification outages fail the
check. Healthy checks do not send messages.

To activate the supplied GitHub workflow after reviewing the target environment:

- Set repository variable `SIGNALWORD_MONITORING_ENABLED` to `true`.
- Set repository variable `SIGNALWORD_BACKEND_ORIGIN` to the environment’s HTTPS origin.
- Set secret `SIGNALWORD_MONITOR_SERVICE_ROLE_KEY` to its service-role key.
- Set secret `SIGNALWORD_OPERATOR_WEBHOOK` to an owned operator endpoint accepting
  JSON `{service, severity, problems}`. A successful HTTP response must mean the
  incident was accepted by that system; it does not prove a person was paged.
- Run the workflow manually and perform a controlled failure drill in development.
- Verify the operator actually receives the alert and can identify its environment.

The scheduled workflow runs approximately every five minutes when enabled. GitHub
schedules are best effort; use a dedicated external monitor before promising timely
paging or service availability. This check complements, rather than proves, live
synthetic delivery, crash reporting, or SLO measurement. No real operator message
was sent during development tests.

## Observed verification

| Check | Result |
|---|---|
| `npm run verify` | 91 Node tests, 43 viewer tests, production viewer build passed |
| Local Postgres integration | 177 pgTAP assertions across eight suites passed |
| Swift package | Seven XCTest tests and core verification passed |
| Application UI | Three XCUITest journeys passed on iPhone 18 Pro simulator, iOS 27.0 |
| Release configuration | Simulator Release build passed; fixture excluded by compilation guards |
| Browser regression | Explicit acknowledgement, interrupted POST, revoked link, and 320px layout passed against stub responses |
| Edge TypeScript | Local type-check passed with Deno host declarations; actual deployed Deno execution not established |
| Patch hygiene | `git diff --check` passed |

The third UI journey waits through foreground polling while typing a contact,
verifying that recovery preserves the draft. Xcode's extracted
[test summary](evidence/2026-09-27-ui-summary.json) records three passes and no
failures. [Local verification metadata](evidence/2026-09-27-local-verification.json)
records the source snapshot fingerprint and limitations. These results concern an
uncommitted working tree, not a deployed or signed release. Interrupted simulator
runs were investigated and rerun; only the completed successful run is counted.

## Deployment order

1. Apply `20260927010000_correlated_delivery_receipts.sql` and
   `20260927020000_operational_readiness.sql` to development first.
2. Deploy the updated send adapter/dispatch function and webhook function together.
   The database migration must precede the new webhook RPC call.
3. Deploy the updated authenticated API. Include the existing `deletion-status`
   function; it is required to recover a lost deletion response.
4. Deploy the viewer headers and preserve its event-route rewrite.
5. Run the hosted preflight and a consenting, clearly labeled live TEST journey.
6. Configure operational monitoring, then verify actual incident notification.
7. Install the signed app and run physical interruption, deletion, and consent trials.

Do not reset a deployed database. Existing pre-tag messages remain compatible with
ordinary message-ID callbacks, but cannot gain a missing correlation tag retroactively.

## Remaining release gates

| Gate | What still needs to happen |
|---|---|
| Hosted routing and headers | Run the hosted preflight against an identified development deployment |
| Live provider reconciliation | Lose a send response deliberately, observe signed callback recovery, verify no duplicate send |
| Interrupted deletion | Real lost-response/auth invalidation trial, not only a UI fixture |
| Recipient consent | Actual email/second-device confirmation, resend, replacement, withdrawal, and race evidence |
| Full system | Signed app → actual API → provider → recipient → acknowledgement → resolution → deletion |
| Restore protection | Independent deletion/withdrawal journal, enforced restore-release gate, and isolated restore drill |
| Operations | Owned alert receiver, notification drill, crash reporting, synthetic TEST, and measured monitoring coverage |
| Contract specification | Finish versioned request/response schema inventory beyond current parsers and runtime response validation |

For restore protection, a table restored together with the primary database is not
an independent journal. The restore process must keep outbound delivery and public
access disabled, replay externally durable deletion/withdrawal records, reconcile
provider submissions, and only then authorize release. Those protections must be
implemented and tested before claiming Step 2 complete.
