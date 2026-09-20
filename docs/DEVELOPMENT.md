# Development workflow

## Environments

SignalWord intentionally uses only two environments during the sprint:

- **development/test** for local development, automated tests, provider test mode, and RevenueCat sandbox/Test Store;
- **production** for App Review, TestFlight/public release, the live viewer, and verified provider credentials.

Do not add staging configuration. Configuration must be typed and validated at each application boundary, and all real values stay out of Git.

## Everyday checks

```sh
npm run verify
```

This baseline check validates repository boundaries and runs fast tests without relying on secrets, Xcode, a Supabase project, or a hosted provider. When the corresponding projects are implemented, extend `verify` with their deterministic build/test commands and keep the same command as the CI entry point.

## Required local tools

- Node.js 22 and npm 10 for repository automation and the future viewer;
- Xcode (full installation) for the iOS project, simulator, signing, and XCTest;
- Supabase CLI for migrations, local Edge Functions, and RLS tests.

The iOS Day-0 signing and physical-device checks remain a release gate; a passing CI workflow cannot substitute for them.

## Branches and pull requests

Create short-lived branches from `main` using `feat/`, `fix/`, `docs/`, or `chore/`. Keep each pull request focused, include tests for behavior changes, and complete the pull-request checklist. Protect `main` in GitHub after the initial push by requiring the `Repository checks` workflow.
