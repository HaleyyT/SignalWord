# Dedicated reviewer account — owner setup

This is a SignalWord app account, not your Apple ID, Supabase administrator login, or RevenueCat login. No account has been created by this document. Password sign-in is implemented in candidate source 6232fc4, not in installed historical Build 3.

1. Choose a separate email address/alias you control, used only for app review. Choose a unique password in your password manager. Do not send it in chat or commit it.
2. Open the Supabase project used by the candidate → Authentication → Users → Add user. Use the create-user option that accepts an email and password, if available in your dashboard; enter these yourself. If only an invitation option appears, stop before relying on it: the current app's email-code flow does not set a password, and a separate provider-supported password setup is required.
3. If creating the account with an individual auto-confirm option, use it only for this address you own. Do not disable email confirmation globally, open public signup, disable CAPTCHA, or grant the account administrator privileges. The account must be confirmed and able to use normal password authentication.
4. Tell engineering that the account exists, without sending its password. Verify the final candidate uses that same project. The current development project is not automatically approved for public production.
5. On the replacement installed build, enter this account's email, choose Use an existing password, enter its password, and tap Verify and sign in. Complete the verification. Build 3 does not contain this option; do not delete your existing personal installation just to attempt this step.
6. Complete setup with a separate controlled contact mailbox and confirm consent there. Use synthetic display names. Send a labelled TEST, acknowledge its recipient link and resolve it. Keep this recipient reachable for review. Do not route reviewer messages to an unsuspecting person.
7. Verify background/relaunch and token refresh. The account must remain enabled throughout review. Access tokens still expire normally and refresh securely; do not issue permanent tokens or bypass authentication.
8. In App Store Connect → SignalWord → the version's App Review Information, enable Sign-in required and enter this SignalWord email/password in the private username/password fields. Keep them out of public description, screenshots and Devpost. Add the verified reviewer steps from REVENUECAT_AND_REVIEWER_HANDOFF.md only after actual acceptance. Do not submit yet.

A prepared account is not enough: final reviewer login, TEST delivery and purchase/restore must be tested on the actual candidate. Owner-independent recipient inspection for judges/review must also be documented; do not claim Apple can inspect a mailbox it has not been given legitimate access to.

Sources: [Supabase users](https://supabase.com/docs/guides/auth/users), [password sign-in](https://supabase.com/docs/reference/swift/auth-signinwithpassword), [Apple App Review](https://developer.apple.com/app-store/review/).
