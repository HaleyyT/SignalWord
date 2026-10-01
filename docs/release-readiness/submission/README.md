# Release acceleration handoff

Current Apple follow-up: [Build 8 Guideline 2.1 response packet](apple-2-1-build8/README.md), prepared 1 October 2026. The owner reports Apple rejected the submission for additional information; the actual physical-device recording is still required. The operational checklist below is historical and separate from that response.

This folder holds submission preparation only. **Hosted acceptance is still 11/17 and no manifest is frozen.** Do not install or submit a build on the strength of these documents alone.

1. [First physical session and signing](FIRST_DEVICE_SESSION.md): A1 → C1 → C2 → L1 → L2, evidence, cleanup and repair loop.
2. [Store submission](STORE_SUBMISSION.md): packaging/privacy audit, copy, review notes, screenshots, archive and upload.
3. [Pilot operations](PILOT_OPERATIONS.md): ownership, incident/stop rules, costs, enrollment and recovery.
4. [Remaining hosted setup](../HOSTED_ACCEPTANCE_SETUP.md): six open gates, paid backup approval, Sentry and human Turnstile.
5. [Current progress](../engineer-progress.md): evidence and exact blockers.

## Reproducible identity and freeze

`npm run --silent release:manifest` creates a clean source manifest; it is not hosted acceptance or permission to install. It hashes packaging resources as well as code. Save outside Git, so generating it does not dirty the source. Use the manifest commit for a clean source export/build, not the moving branch tip.

After all hosted gates pass, prepare a private reviewed acceptance JSON containing: matching `commit`, `reproducedCommit`, `environment: development`, `publicEnrollment: false`, exact seven `functionVersions`, `viewerDeployment`, `authorityVersion`, `monitorVersion`, latest migration filename, and exactly H01–H17 entries with `status: PASS` and `evidence: [{file, sha256}]`. Evidence files must be redacted and reviewed. H17's evidence is the final inventory/compatibility review; the freeze command is its final artifact, not a claim that writing JSON proves acceptance.

```bash
node scripts/freeze-candidate.mjs /private/path/reviewed-hosted-acceptance.json /private/path/frozen-candidate.json
```

This refuses dirty/mismatched candidates, missing gates/component versions, missing or modified proof, and overwriting an existing manifest. It cannot authenticate a fabricated human PASS; the operator remains responsible for reviewing evidence. Never use `--allow-dirty` to manufacture a frozen candidate. Subsequent repairs require a new manifest; retain the prior one.

## Current independent work versus user dependencies

Engineering can continue hosted recipient/routing/provider/load tests within the existing consent and rate limits, latency diagnosis, redacted evidence, build verification and narrow repairs. User dependencies: paid-backup quote approval; actual human CAPTCHA session and controlled enrollment decision; active paid Apple membership and owned Team ID; development Sentry account/privacy setup; physical actions and screenshot capture; owner metadata/operations/cost decisions; explicit upload/submission approval. None authorizes public enrollment.

## Verified preparation source

Commit `95477d3030bd09ec0d6177d28b9ed5b4f4326bdc` reproduced successfully in a fresh local clone: npm ci, 178 Node + 44 viewer checks and unsigned Release simulator build; Git status remained clean. [Source manifest](SOURCE_MANIFEST_95477d3.json) and [evidence](RELEASE_PREPARATION_EVIDENCE.json) are retained. This source manifest is explicitly **not frozen hosted acceptance**. Later documentation commits do not change this tested source identity.
