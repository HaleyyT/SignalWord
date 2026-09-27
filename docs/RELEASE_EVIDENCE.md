# Release evidence log

Use this document to record observed release evidence, not intentions. Do not include raw phrases, contact destinations, viewer links, tokens, credentials, or precise location samples.

## Automated baseline

Before each release candidate, run:

```sh
npm run release:preflight
```

It verifies the repository, source syntax, full Xcode availability, local Supabase health, and public viewer copy. A blocked preflight is a release blocker, not a reason to waive the missing check.

## Ten-run end-to-end log

| Run | Build | Device/OS | Trigger result | One event | One delivery | Viewer result | Resolve result | Notes |
|---:|---|---|---|---|---|---|---|---|
| 1 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |
| 2 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |
| 3 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |
| 4 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |
| 5 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |
| 6 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |
| 7 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |
| 8 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |
| 9 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |
| 10 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |

## Physical-device failure matrix

Record the exact observed behavior for the rows in `docs/TEST_PLAN.md`. The weakest relevant result controls public wording.

| Scenario | Build/device | Observed behavior | Claim impact | Evidence reference |
|---|---|---|---|---|
| Locked, app backgrounded | Pending | Pending | Pending | |
| Locked, app force-quit | Pending | Pending | Pending | |
| Reboot before first unlock | Pending | Pending | Pending | |
| Location denied | Pending | Pending | Pending | |
| Airplane mode | Pending | Pending | Pending | |
| Low Power Mode | Pending | Pending | Pending | |

## Privacy and abuse review

| Check | Result | Evidence reference | Follow-up |
|---|---|---|---|
| User A cannot read User B data | Pending | | |
| Invalid/revoked token has generic response | Pending | | |
| Concurrent alert requests create one event/delivery | Pending | | |
| Browser does not persist viewer token | Pending | | |
| Logs contain no destination/token/location/phrase | Pending | | |
| Delete-data flow revokes prior token | Pending | | |

## 2026-09-26 critical recovery/acknowledgement implementation

Local working-tree verification; this is not a signed release or production result.

| Check | Result | Boundary |
|---|---|---|
| npm run verify | PASS: 68 Node tests, 41 viewer tests, viewer production build | local handlers, domain behavior, source checks |
| Swift core verification | PASS | legacy domain invariants |
| swift test | PASS: 5 XCTest cases | SQLite separation, concurrent leases, migration, delayed confirmation, server dates |
| Unsigned iOS simulator build | PASS | real application compiles; no signed device claim |
| npm run test:db | PASS: 145 assertions across 7 suites | applied additive migrations, RLS, recovery, acknowledgement, webhook ordering |
| Browser regression in Chrome | PASS | deterministic API stub, explicit POST, retry, unavailable link, 320px layout |
| Shared Edge TypeScript check | PASS using local TypeScript with Deno host declarations | full deployed Deno runtime remains unverified here |
| git diff --check | PASS | whitespace only |

Migrations were applied only to the local development database. The browser test
uses a fake HTTP response, not a production message or real recipient. The physical
matrix above remains pending. Production identifiers/configuration, signed device
trials, provider setup, external reviews and the 30-day pilot are still required.
The complete multi-phase roadmap is not finished; see implementation/QUALITY_ROADMAP.md.


## 27 September 2026 — Step 2 follow-up, local only

[Repair report](implementation/STEP2_REPAIR_REPORT.md) explains the changes and
remaining gates. Verified: 91 Node tests, 43 viewer tests, 177 database assertions,
7 Swift tests, 3 simulator UI journeys, browser regression with a stub API, core
verification, viewer production build, and simulator Release build. The UI suite
covers manual fallback, relaunch, resolution, deletion, withdrawal, and preserving
contact drafts across recovery polling. No live deployment/provider/device/restore
or operator-notification evidence is implied. See the report's linked JSON results.
