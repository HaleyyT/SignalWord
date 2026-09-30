# Build 6 App Review notes — prepared draft

Use only after Build 6 physical acceptance. Copy credentials into App Store Connect's private sign-in fields, never this file. Replace any earlier closed-pilot/localhost instructions with the verified current paths.

## Review Notes

SignalWord helps a signed-in user notify a consenting trusted contact. It does not contact police, 000 or other emergency services and does not guarantee delivery, rescue or assistance.

Sign in using the dedicated account in the private review fields: choose Sign in, then Use an existing password, complete the normal CAPTCHA and tap Verify and sign in. The account's existing confirmed contact should be restored. An email code is an alternative for users but is not necessary for this reviewer password route. Public Create account is also available with CAPTCHA and email confirmation.

To inspect the alert workflow, tap Send TEST alert once. This creates a labelled rehearsal. Open Delivery details and Refresh status to inspect delivery/acknowledgement separately. Acknowledgement means the recipient link was used; it does not resolve the alert or mean help is coming. Resolve it using Hold to resolve this alert or Review and confirm. Resolution sends an informational email; it needs no recipient confirmation.

For independent email receipt, use People to add an inbox you control and explicitly confirm the consent email in its browser. Confirming a new invitation resets that contact's previous consent/TEST evidence, so retain the existing contact unless you need this separate recipient test. The recipient does not need a Google account or the SignalWord app. Do not use a real person's address without consent.

Apple Vocal Shortcuts performs phrase recognition. SignalWord does not continuously listen or collect the private phrase. In Apple Shortcuts, Send TEST Alert is the rehearsal action; Trigger Alert is the separate REAL action. Configure a TEST shortcut and, if desired, train it in iOS Settings → Accessibility → Vocal Shortcuts. Locked/background behavior depends on iOS/device state and permissions and is not guaranteed.

Safety check-in is server-backed. Once Active — confirmed by server appears with a deadline, Check in now completes it. Missing the deadline may create a REAL alert after the grace period and scheduling run even if the app is closed. For review, check in immediately. Ending a timer does not retract an alert that already exists; resolve that alert separately.

Location is an optional snapshot with availability/freshness information, not continuous tracking. Denying location permission does not prevent alerts.

Settings → Supporter appearance contains an optional one-time non-consumable cosmetic purchase. It unlocks Ocean and Lavender accents. All safety functions remain free. Restore purchases is on the same screen. Purchases use the store account and RevenueCat; safety-account/contact/incident/location data are not supplied as RevenueCat customer identity.

Support: https://www.signalword.app/support
Privacy: https://www.signalword.app/privacy
Password recovery: https://www.signalword.app/auth/recovery

## IAP Review Notes

Product com.signalword.supporter.appearance is a one-time non-consumable appearance unlock. In SignalWord, open Settings → Supporter appearance, purchase through Apple's sheet, then select Ocean or Lavender. Relaunch to confirm the chosen accent remains, and use Restore purchases on the same screen. Standard appearance and every safety feature remain free. The configured US base price is USD 5.99; the app displays the localized App Store price. RevenueCat manages purchase entitlement; there are no judge/reviewer entitlement bypasses.

Upload an actual Build 6 purchase-screen screenshot for IAP review. Include this first non-consumable in the same submission as the accepted app version. Independent reviewer password login and actual TestFlight purchase/restore must be verified before copying these notes as final.
