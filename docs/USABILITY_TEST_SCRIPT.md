# External usability session script

Run this before a release candidate with a person who did not help build SignalWord. The goal is to find unclear setup, safety, and trusted-contact flows; it is not a performance test of emergency response.

## Guardrails

- Use a sandbox build, test contact, and a disposable viewer link.
- Do not use a participant's real safety phrase, contact information, location, or an actual emergency.
- Tell the participant that they may stop at any point and that the product is not emergency services.
- The moderator observes and asks neutral follow-ups. Do not teach the correct path during a task.

## Setup

- One prepared iPhone with the release candidate and a non-sensitive test account.
- A second device or private browser window for the contact-viewer tasks.
- A fresh participant for each session, where possible.
- A note taker recording task outcome, hesitation, wording participants quote, and the build identifier. Do not record private data.

## Moderator opening

> We are testing the product, not you. Please think aloud. This is a test build and will only send clearly labelled test notifications to the supplied test contact. You can stop any task or the session at any time.

## Tasks

Give one task at a time. Read only the text in quotation marks.

1. "Imagine you want to prepare this app so that a trusted contact can receive a test alert. Show me what you would do first."
2. "Set up the test contact and tell me when you believe it is ready."
3. "Find out what must be configured before a vocal shortcut can be used."
4. "Send a test alert. What do you expect the contact to see?"
5. On the second device: "You received this test link. Tell me what this page says, whether it seems current, and what you would do next."
6. "Resolve the alert. What do you think changes for the trusted contact?"
7. "Find the privacy information and tell me what you think the app keeps and how you would ask to delete it."
8. "If setup failed or you needed help, show me where you would go."

## Neutral follow-ups

Use only after the participant has acted or paused:

- "What are you looking for?"
- "What do you expect will happen?"
- "What does that message mean to you?"
- "What would you do next?"

## Session record

| Session | Build | Task | Completed unaided? | Observed issue | Severity | Proposed change | Owner/status |
|---|---|---|---|---|---|---|---|
| Pending | Pending | 1 | Pending | | | | |

Classify severity using `docs/TEST_PLAN.md`: a misunderstanding that could imply an alert was delivered, expose data, or block the primary workflow is P0/P1. Fix and retest P0/P1 before release. Summarize decisions in `docs/RELEASE_EVIDENCE.md` without participant-identifying details.
