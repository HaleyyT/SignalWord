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
