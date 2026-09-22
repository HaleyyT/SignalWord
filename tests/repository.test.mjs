import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

test('repository documents the supported environments', () => {
  const readme = readFileSync('README.md', 'utf8');
  assert.match(readme, /development\/test/i);
  assert.match(readme, /production/i);
});

test('dangerous local configuration is ignored', () => {
  const gitignore = readFileSync('.gitignore', 'utf8');
  assert.match(gitignore, /^\.env$/m);
  assert.match(gitignore, /^\*\.p8$/m);
});

test('planned application boundaries exist', () => {
  for (const path of ['apps/ios', 'apps/viewer', 'supabase/migrations', 'supabase/functions']) {
    assert.ok(existsSync(path), `${path} should exist`);
  }
});

test('locked intent is deliberately narrow and silent', () => {
  const intent = readFileSync('apps/ios/SignalWord/Services/AppIntents/TriggerAlertIntent.swift', 'utf8');
  const credentials = readFileSync('apps/ios/SignalWord/Core/Security/DeviceCredentialStore.swift', 'utf8');
  assert.match(intent, /authenticationPolicy.*\.alwaysAllowed/);
  assert.match(intent, /openAppWhenRun = false/);
  assert.doesNotMatch(intent, /IntentDialog/);
  assert.match(credentials, /kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly/);
});

test('day-one preflight reports the Xcode gate without masking blockers', () => {
  const output = execFileSync('node', ['scripts/day1-preflight.mjs'], { encoding: 'utf8' });
  assert.match(output, /SignalWord Day-1 preflight/);
  assert.match(output, /iOS source spike/);
  assert.match(output, /Full Xcode/);
});

test('release evidence template preserves the required reliability and abuse checks', () => {
  const evidence = readFileSync('docs/RELEASE_EVIDENCE.md', 'utf8');
  assert.match(evidence, /Ten-run end-to-end log/);
  assert.match(evidence, /User A cannot read User B data/);
  assert.match(evidence, /Delete-data flow revokes prior token/);
});

test('Day-7 materials prohibit staged safety claims and retain evidence gates', () => {
  const demoRunbook = readFileSync('docs/DEMO_PRODUCTION_RUNBOOK.md', 'utf8');
  const packet = readFileSync('docs/SUBMISSION_PACKET_DRAFT.md', 'utf8');
  assert.match(demoRunbook, /must never stage a delivery/i);
  assert.match(demoRunbook, /release:preflight/);
  assert.match(packet, /not a submitted Devpost form/i);
  assert.match(packet, /Evidence still required/i);
});

test('release preflight summarizes Supabase health without echoing status credentials', () => {
  const preflight = readFileSync('scripts/release-preflight.mjs', 'utf8');
  assert.match(preflight, /Local Supabase services are running/);
  assert.match(preflight, /Database migration and RLS integration/);
  assert.match(preflight, /npm run test:db/);
  assert.match(preflight, /Supabase status failed; run npx supabase status locally for diagnostics/);
  assert.doesNotMatch(preflight, /PUBLISHABLE_KEY/);
  assert.doesNotMatch(preflight, /SERVICE_ROLE_KEY/);
});

test('database policy integration tests are committed and exercised in CI', () => {
  const policyTest = readFileSync('supabase/tests/rls_policies.test.sql', 'utf8');
  const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
  assert.match(policyTest, /select plan\(17\)/);
  assert.match(policyTest, /anonymous users have no direct viewer-token privileges/);
  assert.match(ci, /npm run test:db/);
});
