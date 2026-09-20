import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('viewer contract fixture exposes only the public projection', () => {
  const event = JSON.parse(readFileSync('contracts/v1/public-event.response.json', 'utf8'));
  assert.equal(event.location.freshness, 'live');
  assert.deepEqual(Object.keys(event).sort(), ['displayName', 'guidance', 'kind', 'lastUpdatedAt', 'location', 'state', 'triggeredAt']);
  assert.equal('eventId' in event, false);
  assert.equal('contactDestination' in event, false);
});
