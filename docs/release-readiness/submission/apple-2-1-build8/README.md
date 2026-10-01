# Guideline 2.1 information-response packet for Build 8

Prepared on 1 October 2026 against the submitted **1.0 (8)** source `0326ece1cd5b99e3aea1844e569ac9bb7e88b7d9` and its signed-artifact audit. Later website/CI source changes do not replace that uploaded binary.

The owner's screenshots show submission `871aa417-f89f-48d8-b7ee-5bb67d86c2f8` rejected at 15:00 Sydney under **Guideline 2.1: Information Needed - New App Submission**. The accompanying first IAP remains Ready for Review. Apple's stated reason is limited review history and missing explanatory/demo information; the message does not identify a specific crash or say that TestFlight must display a green Testing status.

## Prepared materials

- [Reply to App Review](REPLY_TO_APP_REVIEW.txt): answers all seven numbered requests, including recipient access, consent controls, service roles and one-time purchase behavior.
- [App Review Notes](APP_REVIEW_NOTES.txt): a shorter matching version for the version's private review Notes field.
- [Physical-device recording guide](RECORDING_GUIDE.md): exact flows and safe account order; preserves the dedicated reviewer account.
- [Recording script](RECORDING_SCRIPT.md): scene-by-scene screen actions and plain narration/captions for the same Build 8 demonstration.

**These are prepared text, not a sent reply or completed recording.** The reply and Notes refer to a supplied physical-device video, so copy them only after attaching that real video or adding its tested reviewer-accessible link. The device model, actual iOS version, video reference and timestamps are not fabricated. Add those facts to Apple's private response once the footage exists.

No password or personal mailbox access is included. The sign-in section relies on the current working password in Apple's private credential fields. The existing recipient mailbox is not assumed accessible to Apple; the instructions give the reviewer an independent route using their own controlled recipient email.

## Coverage of Apple's seven requests

| Requested item | Where covered | Remaining owner input |
| --- | --- | --- |
| Physical-device recording | Reply section 1; recording guide | Actual footage, device/OS facts and attachment/link. Confirm each claimed chapter is shown. |
| Purpose/audience/value | Reply section 2 | Review that this accurately describes the intended product. |
| Setup, login and access | Reply section 3; Notes | Current password in private sign-in fields; keep account/contact available. |
| External services | Reply section 4; Notes | No extra vendor dashboard credentials are required by reviewers. |
| Regional differences | Reply section 5; Notes | Reconfirm no newly introduced region-specific restrictions before sending. Store availability is separate from feature behavior. |
| Regulated/third-party content | Reply section 6; Notes | No new regulatory certificates or content licences are claimed. Reassess if product scope changes. |
| Purchase/navigation | Reply section 7; Notes | Recording of paid access/restore or purchase sheet as actually available. No forced repurchase if already owned. |

## Put it into App Store Connect

1. Finish and check the physical recording using the guide. Keep the reviewer account; delete only the separate disposable account used in the deletion demonstration.
2. Open [the affected submission](https://appstoreconnect.apple.com/apps/6817293151/distribution/reviewsubmissions/details/871aa417-f89f-48d8-b7ee-5bb67d86c2f8), then **Reply to App Review**. Attach the recording or provide its accessible link. Add the actual iPhone model/iOS version and recording reference, then paste the prepared numbered reply. If the message editor limits length, send the numbered sections as consecutive messages rather than dropping a requested answer.
3. In Distribution > iOS version 1.0 > **App Review Information**, verify the private username/password fields and paste the shorter Notes. Add the same recording reference and save. Do not put credentials or private recording details in the public App Store description.
4. Review what is actually attached/saved before sending. This preparation request does not send a message or resubmit the app. After the response is sent, follow Apple's instructions and the submission's actual available resubmission actions; do not withdraw the submission or upload a replacement build solely to change a TestFlight colour.

The submitted build is iPhone-targeted with iOS 18 minimum support. The recording must use the current OS Apple requested; minimum OS support is not a claim that every OS/device was physically tested. Existing automated/owner testing remains evidence, not a guarantee of Apple approval or proof that the new recording exists.

Sources: the owner's 1 October App Review message and [Apple's reply workflow](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/reply-to-app-review-messages/). The implementation was checked for account setup/deletion, check-in, Supporter, consent withdrawal, recipient map link and disabled crash collection; the verified [Build 8 artifact audit](../../evidence/build8-2026-10-01/artifact-verification.json) anchors the binary identity.
