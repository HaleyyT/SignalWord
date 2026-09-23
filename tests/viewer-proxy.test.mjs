import test from 'node:test';
import assert from 'node:assert/strict';

import { proxyPublicEvent } from '../apps/viewer/api/v1/public/events/[token].mjs';

const TOKEN = 'v'.repeat(43);

test('same-origin viewer proxy forwards only the opaque token to the configured public function', async () => {
  let requestUrl;
  const result = await proxyPublicEvent({
    token: TOKEN,
    upstreamOrigin: 'https://project.supabase.co/functions/v1/public-event',
    fetchImpl: async (url) => {
      requestUrl = url;
      return new Response(JSON.stringify({ kind: 'test' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });

  assert.equal(requestUrl, `https://project.supabase.co/functions/v1/public-event/v1/public/events/${TOKEN}`);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { kind: 'test' });
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.equal(result.headers['Referrer-Policy'], 'no-referrer');
});

test('same-origin viewer proxy rejects malformed tokens without contacting upstream', async () => {
  let called = false;
  const result = await proxyPublicEvent({
    token: 'short',
    upstreamOrigin: 'https://project.supabase.co/functions/v1/public-event',
    fetchImpl: async () => { called = true; throw new Error('should not run'); },
  });

  assert.equal(called, false);
  assert.equal(result.status, 404);
  assert.equal(result.body.error.code, 'NOT_FOUND');
});

test('same-origin viewer proxy preserves bounded retry signals and fails closed', async () => {
  const limited = await proxyPublicEvent({
    token: TOKEN,
    upstreamOrigin: 'https://project.supabase.co/functions/v1/public-event',
    fetchImpl: async () => new Response(JSON.stringify({ error: { code: 'RATE_LIMITED' } }), {
      status: 429,
      headers: { 'Retry-After': '30' },
    }),
  });
  const insecure = await proxyPublicEvent({
    token: TOKEN,
    upstreamOrigin: 'http://attacker.example',
    fetchImpl: async () => { throw new Error('should not run'); },
  });

  assert.equal(limited.status, 429);
  assert.equal(limited.headers['Retry-After'], '30');
  assert.equal(insecure.status, 503);
  assert.equal(insecure.body.error.retryable, true);
});
