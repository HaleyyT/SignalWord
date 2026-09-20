# SafeWord Public Claims Ledger

No claim may appear in App Store metadata, screenshots, the demo video, website, social posts, or Devpost submission until its evidence cell is complete. If evidence weakens, narrow or remove the claim.

| Proposed public claim | Required evidence | Current status | Approved wording |
|---|---|---|---|
| “Trigger an alert with a private phrase while your iPhone is locked.” | Physical-device capability matrix on the release build, including background and force-quit behavior | Unproven — Day-1 gate | Do not publish yet |
| “Your phrase is processed on device.” | Apple Vocal Shortcuts documentation plus proof that SafeWord receives no phrase/audio/transcript | Architecture selected; implementation unproven | “Your Vocal Shortcut is recognized by iOS on device; SafeWord never receives the phrase audio.” |
| “SafeWord knows it is you.” | Independent speaker-biometric implementation and validation | Not supported | Prohibited; use “your trained private phrase,” never speaker identity |
| “One phrase sends one alert.” | Client/server idempotency, cooldown tests, and 20-request concurrency test | Planned | Publish only after passing |
| “Your trusted contact is alerted.” | Confirmed contact, production provider acceptance/delivery evidence, honest state semantics | Planned | “SafeWord sends an alert to your confirmed contact”; never guarantee receipt |
| “Live location.” | Server-timestamped samples and freshness thresholds verified on release build | Planned | Prefer “latest available location” unless the viewer is currently within the live threshold |
| “Works offline.” | Demonstrated local persistence and later retry semantics across app/device states | Not guaranteed | “If delivery cannot start, SafeWord preserves a pending alert for the next permitted retry”; immediate contact delivery requires network |
| “Contacts police/emergency services.” | Contracted authorized regional dispatch partner, tested coverage, acknowledgment, legal review | Not available | Prohibited in V1 |
| “Works worldwide.” | Country-by-country provider, locale, legal, App Store, and device coverage | Not available | “Designed to expand internationally”; list tested coverage |
| “Core safety is free.” | Trigger E2E passes with no entitlement and RevenueCat unavailable | Planned | Publish after regression passes |
| “No ambient audio is stored.” | Architecture/code/log review and payload inspection | Planned | Publish after verification |
| “Secure private link.” | Token entropy/hash/expiry/revocation, no-referrer/no-store headers, abuse tests | Planned | Publish after security gate passes |
| Reliability percentage | Controlled trials with device, OS, conditions, sample size, raw results | Not measured | State exact conditions and counts; never imply universal emergency reliability |

## Evidence record template

```text
Claim:
Build/version:
Device/OS:
Test conditions:
Evidence location:
Result:
Known limitations:
Approved public wording:
Reviewer/date:
```

## Release rule

Two people should review the final ledger against:

- App Store description and screenshots;
- permission text and in-app onboarding;
- demo narration/captions;
- privacy and support pages;
- Devpost description and award responses.

Any mismatch is a release blocker because this is a safety-related product.
