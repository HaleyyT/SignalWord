import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

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
