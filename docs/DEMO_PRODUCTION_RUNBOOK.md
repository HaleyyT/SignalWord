# Day 7 demo production runbook

The final video must show real, recorded behavior from the exact release candidate. It must never stage a delivery, substitute mock data for a claimed live result, or include a phrase, contact destination, viewer token, precise location, or account credential.

## Do not film until these gates are green

- `npm run release:preflight` passes with no blocked checks.
- The candidate build number and commit are recorded in `docs/RELEASE_EVIDENCE.md`.
- The locked-device trigger, one canonical event, confirmed test delivery, viewer update, resolution, and privacy boundary each have an evidence entry.
- The displayed profile, contact, location, message, and viewer link are fictional/test data.

If any gate is not green, film only an honest engineering update or wait. Do not edit around missing proof.

## 90–115 second edit plan

| Time | Footage | On-screen caption | Evidence gate |
|---:|---|---|---|
| 0–8 s | Locked iPhone and a calm title card | `SignalWord: one trusted contact, one honest alert` | Product name and safety boundary reviewed |
| 8–20 s | Readiness screen showing configured test state | `Your phrase stays with iOS. SignalWord does not listen in the background.` | Phrase/audio architecture review |
| 20–40 s | One continuous locked-device trigger and second-device receipt | `Test alert received` | Locked trigger and confirmed test delivery |
| 40–58 s | Contact opens viewer and sees timestamp/freshness | `Latest available location` | Viewer token and location-freshness checks |
| 58–72 s | Resolution state reaches the contact viewer | `Resolved status updates the trusted contact` | Resolution E2E evidence |
| 72–86 s | Privacy/support surface and test-mode boundary | `Not emergency dispatch. Delivery is never guaranteed.` | Claims ledger review |
| 86–102 s | Short architecture overlay and measured-study summary | `System Vocal Shortcut + idempotent event + expiring viewer link` | 50-trial and backend evidence, when complete |
| 102–115 s | End card with real public links | `Privacy, support, and source` | Public URLs checked signed out |

Remove a segment whose evidence is incomplete; do not speed up or add narration to conceal it. Essential product proof must end before two minutes.

## Capture checklist

- Start each take from a clean, known device state and record the build/commit off camera.
- Keep both devices in one take through trigger, receipt, viewer, and resolution where practical.
- Use large captions that remain readable on a phone with sound off.
- Show TEST labels clearly. Do not show a message that could be mistaken for a real emergency.
- Remove notifications, private browser history, account identifiers, and precise location before recording.
- Record five complete rehearsals. Log each result in `docs/RELEASE_EVIDENCE.md`.

## Publication check

Before sharing a video URL, watch it signed out on a phone and desktop. Confirm playback, captions, duration, public visibility, audio rights, and that every visible claim is approved in `docs/CLAIMS_LEDGER.md`.
