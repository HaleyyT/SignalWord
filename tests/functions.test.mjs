import test from 'node:test';
import assert from 'node:assert/strict';

import { createPublicEventHandler } from '../supabase/functions/public-event/index.ts';
import { createUserApiHandler } from '../supabase/functions/user-api/index.ts';
import { createBackendGateway } from '../supabase/functions/_shared/supabase.ts';
import { generateViewerToken, sha256Hex } from '../supabase/functions/_shared/tokens.ts';

const USER_ID = '00000000-0000-4000-8000-000000000010';
const EVENT_ID = '00000000-0000-4000-8000-000000000020';
const IDEMPOTENCY_KEY = '00000000-0000-4000-8000-000000000030';
const REQUEST_ID = '00000000-0000-4000-8000-000000000040';
const TOKEN = 'a'.repeat(43);

function alertRequest(overrides = {}) {
  return new Request('https://api.example.test/user-api/v1/alerts', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer user-jwt',
      'Content-Type': 'application/json',
      'Idempotency-Key': IDEMPOTENCY_KEY,
      'X-Request-ID': REQUEST_ID,
      ...overrides.headers,
    },
    body: JSON.stringify(overrides.body ?? {
      kind: 'real',
      triggerMethod: 'vocalShortcut',
      clientTriggeredAt: '2026-09-24T00:00:00Z',
    }),
  });
}

function baseBackend(overrides = {}) {
  return {
    authenticate: async () => ({ id: USER_ID }),
    createAlert: async () => ({
      eventId: EVENT_ID,
      state: 'active',
      delivery: 'queued',
      serverTriggeredAt: '2026-09-24T00:00:01Z',
      reused: false,
    }),
    publicEvent: async () => null,
    ...overrides,
  };
}

function userHandler(backend, deliveries = [], logs = []) {
  return createUserApiHandler({
    backend,
    delivery: { enqueue: async (delivery) => deliveries.push(delivery) },
    logger: { write: (event) => logs.push(event) },
    now: () => 1_000,
    generateToken: () => TOKEN,
  });
}

test('user API rejects a missing bearer token without touching the backend', async () => {
  let authenticateCalls = 0;
  const handler = userHandler(baseBackend({
    authenticate: async () => { authenticateCalls += 1; return { id: USER_ID }; },
  }));
  const response = await handler(alertRequest({ headers: { Authorization: '' } }));
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error.code, 'AUTH_REQUIRED');
  assert.equal(body.error.retryable, false);
  assert.equal(authenticateCalls, 0);
});

test('user API validates payloads and forbids body idempotency keys', async () => {
  const handler = userHandler(baseBackend());
  const response = await handler(alertRequest({
    body: {
      kind: 'real',
      triggerMethod: 'vocalShortcut',
      clientTriggeredAt: 'not-a-date',
      idempotencyKey: IDEMPOTENCY_KEY,
    },
  }));
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'INVALID_REQUEST');
  assert.match(body.error.message, /header/);
});

test('user API returns only the stable public create-alert projection', async () => {
  const deliveries = [];
  const logs = [];
  const handler = userHandler(baseBackend(), deliveries, logs);
  const response = await handler(alertRequest());
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.deepEqual(body, {
    eventId: EVENT_ID,
    state: 'active',
    delivery: 'queued',
    serverTriggeredAt: '2026-09-24T00:00:01Z',
    reused: false,
  });
  assert.equal(deliveries.length, 1);
  assert.equal(response.headers.get('X-Request-ID'), REQUEST_ID);
  assert.equal(JSON.stringify(body).includes(TOKEN), false);
  assert.equal(JSON.stringify(logs).includes(TOKEN), false);
  assert.deepEqual(Object.keys(logs[0]).sort(), ['durationMs', 'method', 'requestId', 'reused', 'route', 'status']);
});

test('twenty concurrent identical creates produce one canonical event and dispatch', async () => {
  let canonical = null;
  let createCount = 0;
  let mutex = Promise.resolve();
  const backend = baseBackend({
    createAlert: async () => {
      let release;
      const previous = mutex;
      mutex = new Promise((resolve) => { release = resolve; });
      await previous;
      try {
        if (canonical) return { ...canonical, reused: true };
        await new Promise((resolve) => setTimeout(resolve, 2));
        createCount += 1;
        canonical = {
          eventId: EVENT_ID,
          state: 'active',
          delivery: 'queued',
          serverTriggeredAt: '2026-09-24T00:00:01Z',
          reused: false,
        };
        return canonical;
      } finally {
        release();
      }
    },
  });
  const deliveries = [];
  const handler = userHandler(backend, deliveries);

  const responses = await Promise.all(Array.from({ length: 20 }, () => handler(alertRequest())));
  const bodies = await Promise.all(responses.map((response) => response.json()));

  assert.equal(createCount, 1);
  assert.equal(deliveries.length, 1);
  assert.deepEqual(new Set(bodies.map((body) => body.eventId)), new Set([EVENT_ID]));
  assert.equal(responses.filter((response) => response.status === 201).length, 1);
  assert.equal(responses.filter((response) => response.status === 200).length, 19);
});

test('public API hashes the token and returns only the viewer projection', async () => {
  let receivedHash;
  const projection = {
    kind: 'test',
    displayName: 'Sample user',
    state: 'active',
    triggeredAt: '2026-09-24T00:00:01Z',
    lastUpdatedAt: '2026-09-24T00:00:01Z',
    guidance: { summary: 'Contact Sample user now.' },
    internalSecret: 'must-not-cross-boundary',
  };
  const logs = [];
  const handler = createPublicEventHandler({
    backend: baseBackend({ publicEvent: async (hash) => { receivedHash = hash; return projection; } }),
    logger: { write: (event) => logs.push(event) },
    now: () => 1_000,
  });
  const response = await handler(new Request(`https://api.example.test/public-event/v1/public/events/${TOKEN}`));

  assert.equal(response.status, 200);
  const responseBody = await response.json();
  assert.equal(responseBody.internalSecret, undefined);
  assert.deepEqual(responseBody, {
    kind: 'test',
    displayName: 'Sample user',
    state: 'active',
    triggeredAt: '2026-09-24T00:00:01Z',
    lastUpdatedAt: '2026-09-24T00:00:01Z',
    guidance: { summary: 'Contact Sample user now.' },
  });
  assert.equal(receivedHash, await sha256Hex(TOKEN));
  assert.equal(receivedHash.includes(TOKEN), false);
  assert.equal(JSON.stringify(logs).includes(TOKEN), false);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.match(response.headers.get('X-Request-ID'), /^[0-9a-f-]{36}$/);
  assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
  assert.match(response.headers.get('Content-Security-Policy'), /default-src 'none'/);
  assert.match(response.headers.get('Strict-Transport-Security'), /max-age=/);
});

test('invalid and unknown public tokens share the same safe unavailable response', async () => {
  const handler = createPublicEventHandler({
    backend: baseBackend({ publicEvent: async () => null }),
    logger: { write() {} },
    now: () => 1_000,
  });
  const invalid = await handler(new Request('https://api.example.test/public-event/v1/public/events/short'));
  const unknown = await handler(new Request(`https://api.example.test/public-event/v1/public/events/${TOKEN}`));
  const [invalidBody, unknownBody] = await Promise.all([invalid.json(), unknown.json()]);

  assert.equal(invalid.status, 404);
  assert.equal(unknown.status, 404);
  assert.equal(invalidBody.error.code, 'NOT_FOUND');
  assert.equal(unknownBody.error.code, 'NOT_FOUND');
  assert.equal(invalidBody.error.message, unknownBody.error.message);
  assert.equal(invalidBody.error.retryable, unknownBody.error.retryable);
});

test('viewer tokens contain 256 random bits encoded as unpadded base64url', () => {
  const tokens = new Set(Array.from({ length: 100 }, generateViewerToken));
  assert.equal(tokens.size, 100);
  for (const token of tokens) assert.match(token, /^[A-Za-z0-9_-]{43}$/);
});

test('backend gateway forwards caller auth and maps the internal RPC result', async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, init) => {
    request = { url, init };
    return new Response(JSON.stringify([{
      event_id: EVENT_ID,
      event_state: 'active',
      delivery_status: 'queued',
      server_triggered_at: '2026-09-24T00:00:01Z',
      reused: false,
    }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const gateway = createBackendGateway({ url: 'https://project.supabase.co/', anonKey: 'publishable-key' });
    const result = await gateway.createAlert({
      kind: 'real', triggerMethod: 'manual', clientTriggeredAt: '2026-09-24T00:00:00Z',
    }, USER_ID, IDEMPOTENCY_KEY, TOKEN, 'user-jwt');

    assert.equal(result.eventId, EVENT_ID);
    assert.equal(request.url, 'https://project.supabase.co/rest/v1/rpc/create_or_reuse_alert');
    assert.equal(request.init.headers.Authorization, 'Bearer user-jwt');
    assert.equal(request.init.headers.apikey, 'publishable-key');
    const rpcBody = JSON.parse(request.init.body);
    assert.equal(rpcBody.p_idempotency_key, IDEMPOTENCY_KEY);
    assert.equal(rpcBody.p_viewer_token, TOKEN);
    assert.equal('idempotencyKey' in rpcBody, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('malformed successful database results fail closed as retryable', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify([{ event_id: EVENT_ID, reused: false }]), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  try {
    const gateway = createBackendGateway({ url: 'https://project.supabase.co', anonKey: 'publishable-key' });
    await assert.rejects(
      gateway.createAlert({
        kind: 'real', triggerMethod: 'manual', clientTriggeredAt: '2026-09-24T00:00:00Z',
      }, USER_ID, IDEMPOTENCY_KEY, TOKEN, 'user-jwt'),
      (error) => error.code === 'SERVICE_UNAVAILABLE' && error.retryable === true,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
