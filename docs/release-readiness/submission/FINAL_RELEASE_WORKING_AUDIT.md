# SignalWord release hardening — 30 September 2026

Status: NOT RELEASE READY. This is a working audit, not a frozen manifest.
Coordinated base: c8a230c, feat/hosted-restore-compatibility, release-readiness worktree.
Next runtime candidate: 1.0 (4), not yet archived/uploaded. Build 3 remains the historical internal-only baseline.

## Change inventory
| Branch / commit | Purpose | Release relevance / integration decision |
|---|---|---|
| c8a230c / release-readiness | Build 3 upload record and integrated native UX | Selected coordinated base |
| contact-escalation: d845180, 324aa59, f71fed4 | Auth deletion race, recipient routing, backlog health | git cherry reports patch-equivalent changes already present; do not merge |
| submission-revenuecat-integration: a30f688 | Final Supporter integration | Supporter files identical to integrated aa019ab; no duplicate integration |
| 3067a8b | Earlier Supporter implementation | Superseded by a30f688/aa019ab |
| 87cd8c4 | Older pilot runbook/evidence | Preserve as historical reference; do not overwrite current device guide |
| 08a5954 / c515433 | Next Gen drafts and eligibility notes | Different entry path; not integrated into normal-entry candidate |
| Other historical feature worktrees | Older backend/auth/UI slices | No blind merge; remaining inventory review required before final freeze |

## Physical evidence reconciled
Source: owner's reports and screenshots in this chat, not an instrumented test run.
- Build 3 installed through internal TestFlight after owner cleared compliance.
- TEST App Intent visible; saved shortcut shows correct TEST action.
- Owner reports trained TEST phrase delivered while phone locked.
- Recipient acknowledgement reached sender; two distinct TEST rehearsals displayed.
- Contact and rehearsal state survived app relaunch.
- Owner reports separate REAL shortcut delivered REAL email; phone execution state unspecified.
- Missed timer sent email approximately 1–2 minutes after owner-reported deadline.
- Timer escalation appeared as REAL, was acknowledged, resolved, and reached previous-timer-ended state.
- Later active TEST screens followed additional spoken triggers; do not classify those alone as failed resolution.
- Location snapshot and stale-location warning visible; denied/allowed controlled matrix remains incomplete.
- Recurring protected-session warning remains physical defect until replacement build retest.
No private phrase, email capability URL, exact coordinate or code is retained in this record.

## Recovery repair
prepare() set the identity ready before fetching profile/contact. A later failure displayed an account warning, but a successful retry skipped the identity block that cleared it. Foreground task cancellation could also fall through to the generic warning.
Repair clears the warning only after all preparation reads succeed and ignores explicit cancellation. Genuine ongoing failures remain visible.
This repairs reproducible code paths, not proof of the initiating network failure on the device.

## Regression
- Repository/contracts/security: PASS.
- Node: 213 PASS; viewer: 44 PASS.
- Swift core: 42 PASS; actual Sentry serializer: 1 PASS.
- Journey simulator run: 11 PASS, 1 FAIL (new cancellation test incorrectly expected ready state despite cancelled contact read).
- Corrected cancellation assertion: 1 PASS, zero runtime warnings.
- Failed run and corrected rerun logs retained in ../evidence/release-hardening-2026-09-30/.
- Failed result bundle: /var/folders/hx/q701f8992p35385dn217cg1w0000gn/T/signalword-ui.dDag1c/Journey.xcresult
- Corrected result bundle: /var/folders/hx/q701f8992p35385dn217cg1w0000gn/T/signalword-ui.Y8eP07/Journey.xcresult
These are impacted regressions, NOT the complete final hosted/release suite.

## Change impact
| Change since Build 3 | Physical retest | Hosted impact |
|---|---|---|
| Recovery warning/cancellation handling | Background/foreground, network interruption then retry, contact/alert recovery, no relaunch needed to clear warning | No schema/API change; repeat integration with final binary |
| Build 4 version increment | Install/version/signing smoke | Manifest must use new artifact |
| Future Apple RevenueCat key/mapping | Product retrieval, purchase, cancel, restore, relaunch/revocation; safety while billing unavailable | Verify live provider configuration before freeze |

## Live external state
Devpost project 1449148, slug signalword: submission_draft, no video, no submitted_at, website field is marketing site rather than public store listing.
RevenueCat project e0c77650: dashboard freshly showed Test Store only, no live transactions. Apple configuration form requires bundle ID and private in-app purchase P8/Key ID/Issuer ID. No credential uploaded or new app saved.
Normal Shipaton requirements freshly obtained through Devpost MCP: working RevenueCat purchase, public listing, public <=2 minute video, 1024 icon, 1179x2556 screenshot without device frame, trial or judge premium code.
Submission deadline: 2026-10-01T06:45:00Z = 1 October 2026 16:45 Australia/Sydney.
Public release eligibility is separately stated as August 1–September 30; do not infer that a later public release qualifies merely because form remains open.
No new rules acceptance or contest submission recorded.

## Hosted gates
Latest retained Sol record remains H11 BLOCKED on fresh provider replay identity/timestamp; H16 FAIL retained (2,020ms); H08 PREPARING, no actual managed restore proof. H04 compatibility must be reconciled against saved OTP evidence. H17 NOT FROZEN.
Historical documents saying no purchase authorization are superseded by owner's conditional US$40/48-hour authorization; activation still requires fully staged safety preparation and actual quote. No purchase this pass.

## Apple review audit — incomplete, fail closed
| Area | Current disposition | Required completion |
|---|---|---|
| 2.1 completeness/reviewer access | FAIL | Invited email-code flow still needs owner-independent reviewer access. No permanent OTP/backdoor permitted. |
| 2.3 accurate metadata | REVIEW | Existing draft describes pilot/no purchases; revise only after final actual runtime config. |
| 3.1.1 IAP | FAIL | Apple app connection, product, price, first IAP submission alongside app, sandbox proof outstanding |
| 5.1 privacy/deletion | PARTIAL | Consent/deletion safeguards exist; final aggregate manifests and real processor configuration audit required |
| Location / safety claims | PARTIAL | Snapshot freshness and no emergency-service guarantees visible; final permission/denied-device test required |
| Accessibility | PARTIAL | Prior Dynamic Type/layout evidence retained; final physical VoiceOver/focus/motion checks incomplete |
| Export | PARTIAL | Build 3 examined; final archive must be reinspected |
| Public operations | FAIL | Development backend cannot silently become a public production service; hosted gate closure outstanding |

Private Vocal Shortcut phrase is not collected by SignalWord: App Intents receive an action, not audio/phrase. No app microphone/speech permission.
App manifest currently declares name, email, contacts, user ID, precise location, other user content and product interaction for functionality, linked, not tracking.
Final billing disclosure must include purchase information and applicable RevenueCat identifiers; anonymous billing IDs are not proof of no collection.
Crash reporting remains disabled; no new Sentry features enabled.

## Judge access
Use Apple's supported non-consumable offer codes, not a hard-coded entitlement or hidden bypass.
Production code generation requires app Ready for Distribution and IAP Approved. Then create limited judge codes, test redemption with separate eligible account, open Supporter and restore/refresh entitlement, verify appearance, provide code/instructions privately to judges.
Codes do not grant access to closed SignalWord onboarding: reviewer/judge auth remains a separate blocker.
Sources: https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/create-offer-codes-for-in-app-purchases
https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy
https://developer.apple.com/app-store/review/guidelines/

## Owner-only dependencies
1. Complete legitimate Apple agreements/tax/banking where required; never send personal identifiers in chat.
2. Upload Apple purchase key into the prepared RevenueCat form directly; no private key committed or shared in chat.
3. Perform final physical purchase/restore and targeted recovery tests once engineering supplies the replacement build.
4. Approve final App Review submission only when complete, then approve public release after Apple approval.
No claim of >=96 or full readiness. Engineering work remains: full inventory, reviewer flow, provider setup, hosted gates, final assets/video, archive and freeze.

Recovery repair committed as b7ea4e1. Build-4 configuration checks passed after increment. RevenueCat Apple form was prepared with com.signalword.app; Save was not pressed and no private key uploaded.
