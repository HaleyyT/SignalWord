# Contact escalation — local verification candidate

Scope: three individually consenting email contacts. No monitoring, police integration or live sends. Not deployed, not merged.

## Architecture

- `trusted_contacts` gains explicit primary selection. A serialized database trigger limits each account to three slots (including disabled slots, which can be replaced). Existing endpoints read/replace only the primary contact.
- The authenticated v2 contact endpoint uses the existing server-only encryption/invitation boundary. Each invitation requires its own confirmation. Retrying an add for the same fingerprint returns its existing record, avoiding repeated invitation traffic after a lost response; explicit replacement/resend revokes previous consent.
- v2 alert creation uses the existing durable command/idempotency/cooldown pipeline. Under locks, the database snapshots confirmed contacts, names, destinations and routing policy. Pending/disabled contacts are excluded. The primary must be confirmed. Each recipient gets a separately generated capability and encrypted delivery payload.
- Policy is either all recipients immediately or primary immediately and remaining recipients due after two minutes. The existing scheduled outbox worker claims due work; no mobile process is needed for the delay. An immutable scheduled timestamp is distinct from retry scheduling.
- Worker claims lock the event and delivery, skip competing claims, preserve leases and unknown outcomes, and respect expiry and recipient consent. Resolution cancels unclaimed initial work. Already claimed/submitted sends cannot be recalled; those recipients get a resolution update after initial acceptance. Acknowledgement never controls escalation.
- Each recipient's public view exposes only that link's acknowledgement. The sender reads an authenticated, bounded per-recipient projection. Withdrawal revokes only that recipient's links and work. Account deletion cascades all recipient records and retains the existing deletion receipt behavior.
- The sender People page manages the network and routing. Active alert cards show recipient progress, scheduled times, explicit failure/unknown states and acknowledgements. Server refresh reconciles after relaunch; mutations are not shown as saved before server confirmation. New mobile builds use v2 alert creation; v1 remains single-primary for old clients.

The existing session-deletion fix (`2f9919c`, cherry-picked as `d845180`) is an explicit dependency because it is not on main. The feature branch was created from `origin/main` at `2303014`; main was not modified.

## Verification

See the consolidated handoff for final counts and commit identifiers. Tests include database recipient isolation and invitation retry, ownership, TEST/REAL separation, revoked capabilities, snapshot routing, due claims, independent acknowledgement, deletion, duplicate claims, and resolution. The local concurrency script uses separate PostgreSQL connections and waits for an actual lock-holding transaction before launching competitors. It refuses a non-idle local outbox and does not accept a hosted connection string.

The simulator network service is compiled only for DEBUG simulator builds and never sends messages. It proves UI wiring and relaunch behavior, not live provider delivery. Existing core tests exercise durable commands, offline retry and TEST/REAL separation. Existing provider tests exercise retry and unknown-outcome behavior; no provider acceptance is claimed by these fixtures.

## Before merging or enabling

1. Review the migration and its compatibility changes. Apply first to an isolated development deployment, then deploy the compatible user API/worker, then install the new signed client. Keep old clients for the compatibility check.
2. Use three consenting test recipients. Confirm separately; verify only the confirmed recipients enter the snapshot. Verify pending primary disables triggering until confirmed or another confirmed primary is selected.
3. TEST both routing policies. Verify three different links, no cross-recipient acknowledgement, two-minute delayed sends while unresolved, acknowledgement does not cancel escalation, and resolution before the delay prevents remaining sends.
4. Repeat with offline/relaunch, invitation-response loss, recipient withdrawal, expiry, provider timeout, and deletion. Verify actual email contents and callbacks, including a resolution while an initial send is already in flight.
5. Verify VoiceOver, Dynamic Type, longest names and small screens. Confirm policy changes are understood as applying only to newly accepted incidents.
6. Keep public release blocked by the existing restore, monitoring, signed-device, pilot and SMS gates. No full-system physical-device or live provider evidence was gathered for this feature.

The database linearization point is the claim transaction: a send already claimed before withdrawal/resolution can still reach the provider. The UI must never suggest it can retract an email. Worker scheduling latency is additional to the two-minute configured delay and requires a hosted scheduling acceptance test.

## Recorded local gate results

- Node/API: 109 tests passed; viewer: 43 tests passed; production viewer build passed.
- Swift: 31 tests passed; core verification passed; Release simulator build passed.
- Simulator journeys: 5/5 passed, no runtime warnings (iPhone 18 Pro simulator / iOS 27.0). Includes network invitation, routing selection, relaunch and withdrawal. No physical-device claim.
- Database: 237 assertions across 12 suites passed.
- Separate-connection concurrency: 5 scenarios passed (duplicate claims, resolve/dispatch, concurrent idempotent acceptance, acknowledgement/dispatch, withdrawal/dispatch).
- Browser: recipient acknowledgement/retry/revocation/mobile regression, simulated signup bridge, and six homepage viewport/theme combinations passed.
- All six Edge Functions type-checked. Repository security/contract checks passed; production dependency audit reported zero vulnerabilities.
- SQL lint: application `public` schema checked separately. Broad lint also reports pgTAP extension internals whose temporary test tables are absent outside a test transaction; these are extension diagnostics, not suppressed application errors.

Defects found and addressed: initial deliveries previously remained sendable after resolution; existing resolution fixture was changed to start with a submitted initial message, preserving its original resolution/withdrawal assertions. Added immutable escalation timestamps so retry scheduling cannot move the displayed original escalation time. Fixed Swift actor-isolation compilation and fenced stale refreshes against mutations/deletion. Corrected a test-only service-role table read instead of granting broader access. Concurrent withdrawal can temporarily hold the whole incident; tests verify other recipients survive and are claimable exactly once after release.
