# Dedicated reviewer account — owner setup

This is a SignalWord app account, not your Apple ID, Supabase administrator login, or RevenueCat login. The owner created review@signalword.app in signalword-dev (voepalyamwgenceawdvl). Email confirmation and an OTP login were verified on 30 September. Password/CAPTCHA login still requires acceptance on the replacement candidate. Build 4 has password sign-in but no sign-out control; the next candidate adds sign-out.

1. Keep the existing dedicated reviewer account; do not create a duplicate. For any future replacement, choose a separate email address/alias you control, used only for app review. Choose a unique password in your password manager. Do not send it in chat or commit it.
2. Open the Supabase project used by the candidate → Authentication → Users → Add user. Use the create-user option that accepts an email and password, if available in your dashboard; enter these yourself. If only an invitation option appears, stop before relying on it: the current app's email-code flow does not set a password, and a separate provider-supported password setup is required.
3. If creating the account with an individual auto-confirm option, use it only for this address you own. Do not disable email confirmation globally, open public signup, disable CAPTCHA, or grant the account administrator privileges. The account must be confirmed and able to use normal password authentication.
4. Tell engineering that the account exists, without sending its password. Verify the final candidate uses that same project. The current development project is not automatically approved for public production.
5. On the replacement installed build, enter this account's email, choose Use an existing password, enter its password, and tap Verify and sign in. Complete the verification. Build 3 does not contain this option; do not delete your existing personal installation just to attempt this step.
6. Complete setup with a separate controlled contact mailbox and confirm consent there. Use synthetic display names. Send a labelled TEST, acknowledge its recipient link and resolve it. Keep this recipient reachable for review. Do not route reviewer messages to an unsuspecting person.
7. Verify background/relaunch and token refresh. The account must remain enabled throughout review. Access tokens still expire normally and refresh securely; do not issue permanent tokens or bypass authentication.
8. In App Store Connect → SignalWord → the version's App Review Information, enable Sign-in required and enter this SignalWord email/password in the private username/password fields. Keep them out of public description, screenshots and Devpost. Add the verified reviewer steps from REVENUECAT_AND_REVIEWER_HANDOFF.md only after actual acceptance. Do not submit yet.

A prepared account is not enough: final reviewer login, TEST delivery and purchase/restore must be tested on the actual candidate. Owner-independent recipient inspection for judges/review must also be documented; do not claim Apple can inspect a mailbox it has not been given legitimate access to.

Sources: [Supabase users](https://supabase.com/docs/guides/auth/users), [password sign-in](https://supabase.com/docs/reference/swift/auth-signinwithpassword), [Apple App Review](https://developer.apple.com/app-store/review/).

## Reviewer onboarding repair — 30 September

The reviewer authentication user existed, but the live database had no profile and no trusted contact. The profile PUT returned 503 before invitation submission. Migration `20261001050000_invited_profile_recovery` was applied to the exact project above and recorded in its migration ledger. It initializes only the authenticated, email-confirmed caller's missing profile and preserves deletion tombstones. Anonymous execution remains denied. No email was sent by diagnosis or deployment.

Retry contact setup once after reopening the app. Use a controlled recipient inbox; two Google accounts are not required. The recipient needs email access, not a SignalWord account. A separate recipient inbox makes the sender/recipient review journey clearer. Do not give Apple access to a personal mailbox. Either provide legitimate access to a dedicated review inbox through private review information, or document how reviewers can use a recipient address they control. This mailbox arrangement remains an owner action.

Do not use Delete account and data to switch users. On the replacement candidate, finish active alerts/timers and use Sign out. The next user must sign in normally; shortcuts use the signed-in account. The earlier personal-account deletion is not reversed by this migration.

Acceptance remains: password login with CAPTCHA; recipient consent; one TEST delivery/acknowledgement/resolution; session persistence; sign-out and same-account login; sandbox purchase/unlock/relaunch/restore. OTP success is not password-login evidence. Simulator fixtures are not proof of hosted mail or StoreKit transactions.
