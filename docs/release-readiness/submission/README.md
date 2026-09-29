# Release acceleration handoff

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
