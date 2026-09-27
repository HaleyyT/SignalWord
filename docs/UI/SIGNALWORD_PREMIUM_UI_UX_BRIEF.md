# SignalWord UI implementation brief

## 1. Product scope and safety contract

This document is the single implementation specification for the current SignalWord iOS app and its account-free recipient website. Preserve the current release scope and service contracts. Treat safety claims as product behavior: presentation must never make a stronger claim than the underlying state supports.

### Supported behavior

- iOS Accessibility Vocal Shortcuts recognizes user-configured phrases and invokes one of SignalWord's TEST or REAL alert actions. SignalWord cannot inspect or verify the operating-system configuration.
- A user can create a TEST alert for rehearsal and a REAL alert manually or through its Vocal Shortcut action.
- Manual REAL alerts require a prepared device identity and a recipient whose email consent is confirmed. Location permission and rehearsal evidence do not gate a manual REAL alert.
- SignalWord can include a recent cached location snapshot with an alert when one is available. Location is optional; it is not live tracking and the app does not wait for a new fix before sending.
- The app saves alert commands locally, reconciles status when it can connect, and requires explicit user confirmation before sending a sufficiently delayed command.
- The sender can authenticate before resolving an active alert. The recipient website can acknowledge an alert through its POST endpoint.
- One confirmed recipient is supported. Replacing or withdrawing that recipient requires renewed consent and fresh rehearsal evidence.
- Every invitation submission calls the current create-or-replace operation: it invalidates any prior confirmation and resets TEST evidence, including when the same email is entered again. Do not present a resend as retaining consent or rehearsal evidence.
- The recipient can open a secure, account-free web link to review the alert, available location snapshot, freshness, and status.

### Safety wording

Keep these facts distinct in every screen and message:

1. **Saved locally** — the command is on this iPhone; the service has not accepted it.
2. **Accepted by SignalWord** — the server created or recovered an alert; this says nothing by itself about email delivery.
3. **Provider accepted** — the email provider accepted the send request; recipient delivery is not yet confirmed.
4. **Provider reported delivered** — the provider reported delivery to the recipient's mail system; this does not prove a person read it.
5. **Acknowledged** — someone used the recipient link; this does not identify the person or mean help is coming.
6. **Resolved** — the sender authenticated and SignalWord accepted the resolution; resolution-message delivery has its own independent status.

Never promise that delivery, retries, location, contact identity, or help are guaranteed. Never say SignalWord contacted emergency services. Keep TEST and REAL labels visible through setup, history, status details, and the recipient website. Mark a TEST plainly as **TEST — NO EMERGENCY**.

## 2. Visual system and component rules

### Visual character

Calm, private, precise, human, and premium. Use restrained surfaces, generous spacing, native SF typography, clear state labels, and one Signal Violet accent. Avoid siren styling, flashing or pulsing alerts, alarm-heavy iconography, dense dashboards, generic equal-weight card grids, fake authority, and decorative motion that competes with alert state.

### Tokens

| Token | Value | Use |
| --- | --- | --- |
| Canvas | `#0B0D10` | Main background |
| Surface | `#12151A` | Primary grouped surface |
| Raised surface | `#181C22` | Nested controls and input wells |
| Primary text | `#F5F7FA` | Titles and critical facts |
| Secondary text | `#A9B0BC` | Explanatory copy |
| Muted text | `#707887` | Nonessential metadata only |
| Signal Violet | `#7A6FF0` | Main action and selected state |
| Ready | `#2ECF91` | Positive readiness only |
| Attention | `#F2B95F` | Setup, stale, or delayed state |
| Critical | `#FF6262` | Real failure or destructive action only |

Use native semantic text styles and a 4/8-point spacing rhythm. Keep page insets around 20–24 pt, primary touch targets at least 44 pt, and card/control corners consistent. Centralize colors, spacing, radii, and motion durations. Use accessible foreground/background pairs; never rely on color alone.

### Reusable pieces

Build and reuse a small set of SwiftUI components: compact status header, signal mark, readiness row, primary and secondary actions, labeled field group, trusted-recipient summary, inline status/error message, delivery summary, safe TEST action, and one shared hold-confirm control. Components need clear VoiceOver labels, disabled/progress states, flexible text sizing, and Reduce Motion support.

The signal mark is a small brand element, not a large decorative hero. It must not displace the alert state or primary action on a small iPhone.

## 3. Navigation, screens, and state-dependent actions

Use three primary destinations: **Home**, **People**, and **Settings**. Preserve tab state and user-entered drafts when navigating into and back out of setup. A focused setup flow can be pushed or presented, but it must have a reliable Back/Cancel route and a direct return to Home.

### Home

Order content by urgency and usefulness:

1. Current alert or saved/delayed command, if present.
2. One primary action, based on what the user can actually do now.
3. The next required setup issue and a direct route to fix it.
4. Separate compact summaries for manual-alert availability, shortcut setup report, acknowledged TEST evidence, and optional location.
5. Latest TEST/REAL activity and a safe rehearsal entry point.

Do not count optional location or the user-reported shortcut setting as server-verified readiness. Prefer labels such as **Manual alert available**, **Recipient confirmation needed**, **Shortcut setup reported**, **2 acknowledged TESTs**, **Locked test: user-reported**, and **Location optional**. “Ready” must name which capability is ready.

Show the event kind in every active/recovered state: **TEST alert active** or **REAL alert active**. A REAL alert uses the shared hold-confirm control plus a clear accessible tap alternative. A TEST action is visibly safe and clearly says it sends a TEST message.

### People

Show one compact recipient summary with name and consent status. Pending consent is not ready. Provide explicit **Check status**, **Resend invitation**, **Replace recipient**, and **Withdraw consent** actions where applicable. Before replacement, explain that the new recipient must confirm and previous rehearsal evidence will be cleared. Preserve typed names and email on network errors. Keep destructive withdrawal separate from the primary action.

The TEST flow explains the message is clearly labelled TEST and does not imply an emergency. Show each distinct acknowledged TEST event as evidence. Keep the locked-device confirmation separate and label it **user-reported**. Never silently count the same event twice.

### Settings

Keep Settings focused on Vocal Shortcut instructions, the self-reported setup toggle, rehearsal progress, optional location permission, privacy, status refresh/recovery, support/version when available, and account deletion. Do not imply the app can inspect iOS Accessibility configuration.

Deletion must use explicit confirmation. If deletion is interrupted, resume it on launch and show whether cleanup completed or which next action is needed. Preserve actionable errors and avoid claiming success until the server receipt and local cleanup agree.

### Recipient website

Keep the page mobile-first and account-free. Prioritize sender, TEST/REAL kind, event state, sent time, latest available location and its age, acknowledgement state, and resolution state. Explain that a location is a stored point-in-time sample. Keep one primary acknowledgement action, use an explicit POST, and state that acknowledgement does not confirm a person or arrival of help. Preserve retry and stale-data warnings; do not render stored location as continuous movement.

## 4. Presentation state and interaction requirements

### Typed presentation models

Keep networking, persistence, consent, recovery, and authorization in their existing model/service layers. Add typed presentation values in the presentation boundary for:

- readiness by capability (manual alert, recipient consent, rehearsal evidence, user-reported shortcut setup, optional location);
- selected alert identity, including event ID and TEST/REAL kind;
- initial-alert delivery and resolution-message delivery as separate values;
- event lifecycle and local-command/recovery states;
- freshness for the latest location snapshot.

Map current API values centrally. Known delivery values are `queued`, `sent`, `delivered`, `failed`, and `unknown`. Use honest plain language for each. Treat absent and future unknown values as **Status unavailable / We couldn't confirm this yet**; never default to success. Preserve distinct delivery objects for the initial alert and later resolution message.

Use one canonical selected-event projection to drive the Home status and detail presentation. Do not duplicate status cards or keep stale headline copy after a refresh. Keep TEST/REAL kind attached through creation, recovery, history selection, resolution, and refresh.

### Action lifecycle copy

| State | User-facing meaning | Action |
| --- | --- | --- |
| Locally saved | Saved on this iPhone; service acceptance is unknown | Check connection / retry when online |
| Submitting | Sending command to SignalWord | Show contextual progress; block duplicate activation |
| Accepted | SignalWord created or recovered the alert | Refresh alert and delivery separately |
| Queued / provider pending | Email work is still pending | Explain status is not delivery |
| Provider accepted | Provider accepted the request | Wait for a delivery report; do not say delivered |
| Delivered | Provider reported delivered | Show acknowledgement separately |
| Acknowledged | Recipient link recorded an acknowledgement | Explain it does not prove identity or help is coming |
| Resolution pending | Resolution accepted; separate message may still be pending | Show resolution delivery independently |
| Delayed confirmation | The saved command is old enough to need an explicit choice | Offer a clear confirm-now action after reconciliation |
| Failed / unknown | Delivery or command outcome is not confirmed | Give the relevant retry/check action and retain draft state |

The background service may retry, but UI copy must not promise retries will finish. Acknowledge transport failure without changing user-entered contact data.

### Hold and tap interactions

Use one hold-confirm implementation for REAL alert and resolution actions. Show a subtle, determinate hold-progress treatment. Reset progress on early release, pointer/finger leaving the control, gesture cancellation, app deactivation, and completion. Guard against double activation before starting asynchronous work. Do not use repeated vibration or alarm animation.

Provide a labelled tap action that opens an explicit confirmation for assistive technology and anyone who cannot sustain a hold. Confirming a REAL alert still goes through the same identity/contact checks. Resolving still requires device-owner authentication. VoiceOver must announce the purpose, consequence, and current progress.

Honor Reduce Motion and changes to it while the screen is open. Pause ambient animation when the app is inactive. Support large Dynamic Type, logical VoiceOver order, visible keyboard focus, contrast, and 44-point native touch targets. Keep critical content reachable at default size on the smallest supported iPhone; accessibility sizes may scroll naturally.

Errors must say what succeeded, what remains uncertain, and the next safe action. Empty states should explain why a recipient or event is missing and provide one useful action.

## 5. Implementation order, regression, and evidence

### Implementation order

1. Audit current state transitions, API/wire contracts, existing UI journeys, accessibility identifiers, and uncommitted changes. Do not overwrite unrelated work.
2. Define typed readiness, alert identity, delivery, resolution-delivery, freshness, and local-command presentation states. Fix stale and unknown-state behavior before visual work.
3. Fix navigation, draft preservation, recipient replacement consent, rehearsal evidence, delayed-command confirmation, deletion recovery, and accessible action semantics.
4. Restructure Home, People, and Settings around the hierarchy above. Reuse components and design tokens; keep large screens and action logic out of one monolithic root view.
5. Align the recipient site and verify narrow/mobile, keyboard, zoom, and reduced-motion behavior.
6. Run the appropriate existing and new regressions. Review screenshots and perform manual accessibility/usability checks; report blocked evidence accurately.

### Required regression coverage

- TEST and REAL labels through creation, recovery, event selection, active state, resolution, and recipient view.
- Distinct event counting for two acknowledged TEST events; user-reported locked execution remains a separate signal.
- Optional location does not reduce readiness or prevent a manual alert.
- Delivery state mapping for all known values, absent fields, and unknown future values; initial and resolution delivery never overwrite one another.
- Acknowledgement remains separate from delivery and does not imply identity or help.
- Delayed command reconciliation and explicit confirmation.
- Hold release, pointer departure/cancellation, app interruption, progress reset, and duplicate activation.
- Accessible confirmation path, identity/contact guard, and authentication before resolution.
- Contact pending/check/resend/replace/withdraw, renewed consent and cleared rehearsal evidence, preserved drafts, offline/error states.
- Existing setup → recovery → resolution → deletion UI journeys, including interrupted deletion recovery.
- Recipient acknowledgement is an explicit POST and remains account-free.

### Completion evidence and acceptance

Capture rendered screenshots of every principal screen and critical state on small and large iPhones at default and accessibility text sizes. Review browser layouts at 320 px, keyboard navigation, zoom, and reduced motion. Perform a manual VoiceOver pass and unfamiliar-user task observations. Record evidence, environment, and unavailable checks separately.

Report separate 0–100 scores for **visual craft**, **usability**, **accessibility**, **state correctness**, and **maintainability**, each with concrete supporting evidence. Every score must be at least 97 before claiming the requested standard. Source inspection or compilation alone is insufficient. Broken safety wording, inaccessible critical actions, regressions, or missing essential verification block acceptance regardless of visual score.

Keep UI acceptance distinct from production readiness, live email-delivery validation, and physical-device safety trials.
