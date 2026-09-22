# Controlled vocal-shortcut reliability study

This is the Day 6 study record. It is an evidence template, not a claim of accuracy or a substitute for locked-device release testing.

## Safety and setup

- Use only a trained, non-sensitive test phrase and a confirmed test contact.
- Keep each run clearly marked `TEST`; do not use a participant's real contact, location, or safety phrase.
- Record the iPhone model, iOS version, build commit, locale, network, and whether the device is locked/backgrounded.
- Use server and provider records to reconcile event and delivery counts. Do not place raw viewer tokens, destinations, coordinates, or phrase recordings in this document.

## Required conditions

| Condition | Planned target-phrase trials | Purpose |
|---|---:|---|
| Quiet room | 20 | Baseline invocation behavior |
| Moderate noise | 15 | Understand environment sensitivity |
| Natural sentence containing phrase | 5 | Identify accidental invocation risk |
| Near-match phrase | 5 | Identify false activation risk |
| Different speaker or recording | 5 | Understand, but do not claim, speaker specificity |

Do not combine conditions or silently exclude failed runs. If time runs out, publish the smaller valid count and its limitations.

## Per-run record

| Run | Condition | Device/build | Locked state | Shortcut invoked? | Canonical event count | Confirmed delivery? | Event latency | Delivery latency | Location freshness | Notes |
|---:|---|---|---|---|---:|---|---|---|---|---|
| 1 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | Pending | |

## Reconciliation summary

| Measure | Observed count/value | Evidence reference | Limitation |
|---|---|---|---|
| Target-phrase trials attempted | Pending | | |
| Target-phrase shortcut invocations | Pending | | |
| Near-match/different-speaker invocations | Pending | | |
| Duplicate canonical events | Pending | | |
| Confirmed test deliveries | Pending | | |
| Median event latency | Pending | | |
| Median delivery latency | Pending | | |
| Fresh/recent/stale/unavailable location counts | Pending | | |

## Reporting rules

- Report raw counts by condition, not a universal accuracy percentage.
- A system invocation is not evidence of delivery; a backend event is not evidence of recipient delivery.
- Any duplicate event, unlabelled TEST delivery, false delivery claim, or cross-user exposure is a P0/P1 release blocker under `docs/TEST_PLAN.md`.
- Add the final redacted summary to `docs/RELEASE_EVIDENCE.md` and align all public wording with `docs/CLAIMS_LEDGER.md`.
