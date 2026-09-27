# Public-launch security and reliability gates

Status: development testing only. Updated 28 September 2026.

The live TEST journey and the fixes in [DEVELOPMENT_DEPLOYMENT_STATUS.md](DEVELOPMENT_DEPLOYMENT_STATUS.md) are evidence for specific behaviors. They are not approval for public enrollment or a guarantee against attacks.

## Fixed in this pass

### Contact consent cannot be minted by a client

Previously, an authenticated client could directly call `create_or_replace_contact` with its own confirmation-token hash. A caller who knows that token can attempt confirmation themselves. The encrypted destination and normal UI do not make a client-supplied consent hash trustworthy.

The database now allows only the backend service role to execute this operation. The Edge API first authenticates the sender, takes the owner ID from that verified identity, rejects extra contact input fields, and generates the token and encrypted destination on the server. The privileged write is isolated to contact creation; reads and other lifecycle operations continue to use user credentials. No service credential is returned to the app.

Database regressions exercise the forbidden client call and normal backend-to-recipient flow. Hosted verification confirms direct client calls receive 403. A rollback-only hosted transaction also verified backend creation succeeds without sending another email.

### Webhook uploads have a streaming size bound

Checking size after `arrayBuffer()` allows an untrusted upload to consume memory before rejection. The shared body reader now bounds accumulated bytes and cancels an oversized stream. The webhook retains the exact bytes needed for signature verification. Tests cover chunked oversized bodies, modified signed bodies, and signatures outside the timestamp window.

## Required before public enrollment

| Order | Work | Acceptance evidence |
| --- | --- | --- |
| 1 | Implement protected anonymous onboarding in the iOS app and hosted configuration. Obtain Cloudflare Turnstile/hCaptcha configuration, present a supported challenge during foreground onboarding, and pass the resulting token to Supabase signup. Enable enforcement only after client integration is ready. | Bots without valid proof cannot create sessions; legitimate onboarding, cancellation, expiry and retry work on physical devices. Existing signed-in emergency actions do not require a new challenge. |
| 2 | Verify signup/IP, contact/destination, public-token, and overall provider budgets. Review every directly callable database RPC for ways to bypass server-generated fields or throttling. | Automated abuse tests, documented legitimate-use limits, quota alerts and a tested abuse-response procedure. Consent-boundary regressions remain required. |
| 3 | Review session loss, refresh, and account recovery on device. Distinguish inaccessible Keychain data from a genuinely new installation. Keep manual identity linking disabled until an explicit reauthentication/recovery design exists. | Locked/reboot/offline/refresh/reinstall trials; no silent account replacement or cross-user data access; actionable recovery state. |
| 4 | Configure operator alerts, privacy-filtered crash reporting, independent synthetic tests and responder ownership. Include initial and resolution delivery, unknown outcomes, scheduler HTTP failures and retention failures. | Deliberately induced failures reach the operator; logs/crashes contain no JWTs, email addresses, capability URLs or coordinates. |
| 5 | Implement independent deletion/withdrawal tombstones and an enforced restore gate; document key backup and rotation. | Isolated restore cannot resurrect access or resend old messages; measured restore time/data loss; rotation works with existing ciphertext. |
| 6 | Finish real-device, browser, security and capacity evidence. | Signed iPhone lifecycle including relaunch and locked TEST, accessibility trials, dependency/security review, twice-forecast-peak load, and pilot observations tied to a build. |

CAPTCHA reduces signup automation; it does not replace ownership checks, contact consent, throttling or incident response. The sender's display name is not a verified identity. A recipient link is a capability, not proof of who clicked it. See [Supabase anonymous sign-in guidance](https://supabase.com/docs/guides/auth/auth-anonymous).

## Deployment and rollback rules for the consent fix

1. Run migrations/tests locally, then dry-run the target development project.
2. Apply the privilege-restricting migration and immediately deploy the updated user API. A short contact-setup failure between versions is safer than leaving the bypass open; schedule coordinated rollout before public traffic.
3. Verify forbidden direct access and permitted API behavior, then verify an actual consent journey before pilot promotion.
4. If the new API fails, stop new contact setup and repair it. Do not restore the insecure client grant as a rollback shortcut. Existing confirmed contacts and alert operations do not require this grant.

The current development project and website must not be described as production-ready. Australian SMS, external security review, restore evidence, monitoring and physical-device validation remain governed by the quality roadmap and launch guide.
