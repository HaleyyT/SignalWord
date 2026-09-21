# Privacy and abuse review runbook

Perform this review against the intended release environment after the local Supabase stack is healthy. Record only redacted evidence in `docs/RELEASE_EVIDENCE.md`.

## Prerequisites

- Run `npm run release:preflight`; do not waive a blocked result.
- Use two separate non-production test accounts (User A and User B).
- Use generated test viewer links only. Never paste links, tokens, destinations, or location samples into tickets, commits, screenshots, or logs.
- Have a deletion test account that is safe to remove.

## RLS isolation

1. Authenticate as User A and create only test data owned by User A.
2. Authenticate as User B and attempt each alerts/contact/viewer-token read, update, insert, and delete operation that the client can request.
3. Confirm User B sees no User A data and cannot create a delivery for User A.
4. Repeat using a direct REST request to ensure the outcome is enforced by the database, not only hidden by the UI.
5. Record the request class and generic outcome; omit identifiers and response bodies containing personal data.

## Viewer-link resilience

1. Open a valid generated test link in a private browser session and confirm its intended event renders.
2. Modify one character in the token and confirm the response is the same generic unavailable result used for an expired or revoked link.
3. Revoke or expire a test link, refresh the original browser, and confirm it returns the generic unavailable result.
4. Inspect browser storage, page source, analytics configuration, and referrer behavior. The viewer token must not persist in local/session storage, analytics, logs, or outbound referrers.

## Duplicate and abuse controls

1. Submit the same alert request concurrently with the same idempotency key.
2. Confirm one alert event and one delivery result exist.
3. Submit repeat requests inside the cooldown and confirm the client neither claims delivery nor creates an alert storm.
4. Exercise configured rate limits with safe test destinations; record the boundary and generic client outcome.
5. Confirm TEST alerts remain unmistakably labelled in both delivery content and viewer UI.

## Retention and deletion

1. Use the designated deletion account to request account/data deletion through the supported path.
2. Confirm owned rows and device credentials are removed as designed, active viewer tokens are revoked, and a previously valid viewer link becomes generically unavailable.
3. Verify retention jobs remove expired location samples and viewer tokens in a controlled test.
4. Do not use production user data to test deletion or retention.

## Sign-off

Release is blocked by any cross-user access, token disclosure, false delivery claim, duplicate delivery, or incomplete deletion/revocation result. Log the issue under the P0/P1 policy in `docs/TEST_PLAN.md`, fix it, and repeat the failed case before sign-off.
