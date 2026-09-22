# Independent submission preflight

An observer who did not build the current candidate completes this review in a clean browser/device. They should receive the checklist and report observations, not be coached toward a pass.

## Materials to provide

- Candidate build number and commit.
- Public repository URL, public privacy URL, public support URL, store URL, and video URL when available.
- A fictional/test contact flow and a disposable viewer link.
- `docs/CLAIMS_LEDGER.md` and `docs/RELEASE_EVIDENCE.md`.

Never provide real phrases, contact destinations, credentials, or live personal-location data.

## Review checklist

| Review | Pass condition | Result/evidence |
|---|---|---|
| Candidate identity | Build number and commit match the recorded release candidate | Pending |
| Public links | Privacy, support, repository, store, and video URLs open signed out | Pending |
| Trigger story | Video/UI wording matches observed locked-device behavior exactly | Pending |
| Delivery truth | TEST wording is unmistakable; no receipt or dispatch guarantee is implied | Pending |
| Viewer privacy | Link reveals only its intended event and no token appears in browser storage/referrer | Pending |
| Location truth | The viewer uses the approved freshness wording and does not overstate recency | Pending |
| Safety boundary | Content says that SignalWord is not emergency dispatch and directs immediate danger to local emergency services | Pending |
| Accessibility | Captions are readable with sound off; keyboard focus and large text remain usable | Pending |
| Public data | All visible names, locations, contacts, messages, and analytics are fictional or redacted | Pending |
| Claims ledger | Every public sentence has an approved evidence entry or is removed | Pending |

## Sign-off rule

Any failed privacy, safety, delivery-truth, public-access, or claims-ledger item blocks release/submission. Record the issue with its severity in `docs/TEST_PLAN.md`; only P0/P1 or submission-validity fixes may break the Day 6 feature freeze.
