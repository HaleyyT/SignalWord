import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateProviderReplay } from '../scripts/provider-replay-evidence.mjs';

const input = {
  environment: 'development', sourceCommit: 'a'.repeat(40), fixtureLabel: 'test-delivery-01',
  providerEventDigest: 'b'.repeat(64), capturedBeforeAt: '2026-09-29T11:00:00Z',
  replayRequestedAt: '2026-09-29T11:01:00Z', replayObservedAt: '2026-09-29T11:01:01Z',
  capturedAfterAt: '2026-09-29T11:02:00Z', replayStatus: 'succeeded', webhookStatus: 202,
  before: { deliveryCount: 1, attemptCount: 1, receiptCount: 2, status: 'delivered' },
  after: { deliveryCount: 1, attemptCount: 1, receiptCount: 2, status: 'delivered' },
};

test('fresh signed replay passes only when provider activity is new and storage is unchanged', () => {
  assert.equal(evaluateProviderReplay(input).passed, true);
  for (const change of [
    { webhookStatus: 503 },
    { after: { ...input.after, receiptCount: 3 } },
    { after: { ...input.after, attemptCount: 2 } },
  ]) assert.equal(evaluateProviderReplay({ ...input, ...change }).passed, false);
  assert.throws(() => evaluateProviderReplay({ ...input, replayObservedAt: input.capturedBeforeAt }), /TIMELINE/);
});

test('private extras are not copied into replay evidence', () => {
  const report = evaluateProviderReplay({ ...input, token: 'private', before: { ...input.before, email: 'private' } });
  assert.equal(JSON.stringify(report).includes('private'), false);
});
