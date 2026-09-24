import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const project = readFileSync('apps/ios/SignalWord.xcodeproj/project.pbxproj', 'utf8');
const rootView = readFileSync('apps/ios/SignalWord/Features/AppShell/SignalWordRootView.swift', 'utf8');
const intent = readFileSync('apps/ios/SignalWord/Services/AppIntents/TriggerAlertIntent.swift', 'utf8');

test('iOS project contains a real application target and App Group entitlement', () => {
  assert.match(project, /productType = "com\.apple\.product-type\.application"/);
  assert.match(project, /CODE_SIGN_ENTITLEMENTS = SignalWord\/SignalWord\.entitlements/);
  assert.match(project, /INFOPLIST_KEY_SignalWordAppGroupIdentifier = group\.com\.signalword\.shared/);
});

test('iOS shell preserves honest safety language and deliberate real triggering', () => {
  assert.match(rootView, /does not contact police or emergency services/i);
  assert.match(rootView, /LongPressGesture\(minimumDuration: 1\.5\)/);
  assert.match(rootView, /TEST — NO EMERGENCY/);
  assert.doesNotMatch(rootView, /police (?:were|have been) notified/i);
});

test('locked App Intent remains silent and does not open the app', () => {
  assert.match(intent, /static let openAppWhenRun = false/);
  assert.match(intent, /return \.result\(\)/);
  assert.doesNotMatch(intent, /ProvidesDialog|dialog:/);
});
