import test from 'node:test';
import assert from 'node:assert/strict';
import { proxyEnrollment } from '../apps/viewer/api/enrollment/[token].mjs';
import { createInvitationPreviewHandler } from '../supabase/functions/contact-invitation-preview/index.ts';
import { createJoinCaptchaVerifier } from '../supabase/functions/_shared/turnstile.ts';
import { operationalProblems } from '../supabase/functions/_shared/operational-health.mjs';
const TOKEN = 'a'.repeat(43), MANAGEMENT = 'b'.repeat(64), ID = 'e1000000-0000-4000-8000-000000000001';
const date = '2026-10-20T00:10:00Z', origin = 'https://viewer.example.test';
const proxy = extra => proxyEnrollment({ token: TOKEN, method: 'GET', enabled: true, publicOrigin: origin,
  upstreamOrigin: 'https://backend.example.test/functions/v1/contact-invitation-preview', ...extra });

test('enrollment proxy rejects disabled, cross-origin, malformed and oversized requests before upstream access', async () => {
  let calls = 0;
  for (const patch of [{ enabled: false }, { token: 'bad' }, { method: 'DELETE' },
    { method: 'POST', action: 'begin', requestOrigin: 'https://evil.test', body: {} },
    { method: 'POST', action: 'begin', requestOrigin: origin, body: { padding: 'x'.repeat(5000) } },
    { upstreamOrigin: 'https://user:pass@example.test' }, { upstreamOrigin: 'http://example.test' }]) {
    const result = await proxy({ fetchImpl: async () => { calls++; }, ...patch });
    assert.notEqual(result.status, 200);
  }
  assert.equal(calls, 0);
});

test('proxy projects safe preview/status/action responses and never forwards upstream diagnostics', async () => {
  const preview = await proxy({ fetchImpl: async () => Response.json({ displayName: 'Sender', expiresAt: date,
    consentVersion: '2026-10-19', email: 'private', ciphertext: 'secret' }) });
  assert.deepEqual(preview.body, { displayName: 'Sender', expiresAt: date, consentVersion: '2026-10-19' });
  for (const [action, token, row, expected] of [['begin', TOKEN, { attemptId: ID, expiresAt: date, withdrawalToken: MANAGEMENT, secret: 'hidden' }, { attemptId: ID, expiresAt: date, withdrawalToken: MANAGEMENT }],
    ['verify', TOKEN, { verified: true, secret: 'hidden' }, { verified: true }], ['withdraw', MANAGEMENT, { withdrawn: true, userId: ID }, { withdrawn: true }]]) {
    const result = await proxy({ method: 'POST', action, token, body: {}, requestOrigin: origin, fetchImpl: async (_url, init) => {
      assert.equal(init.redirect, 'error'); assert.equal(init.headers.Origin, origin); return Response.json(row);
    } });
    assert.deepEqual(result.body, expected);
  }
  const failure = await proxy({ fetchImpl: async () => Response.json({ diagnostic: 'private recipient' }, { status: 500 }) });
  assert.doesNotMatch(JSON.stringify(failure), /private recipient/);
  assert.equal(preview.headers['Referrer-Policy'], 'no-referrer');
});

test('proxy stops an oversized upstream stream and keeps management GET read-only', async () => {
  assert.equal((await proxy({ fetchImpl: async () => new Response('x'.repeat(9000)) })).status, 503);
  const result = await proxy({ token: MANAGEMENT, fetchImpl: async (url, init) => {
    assert.match(url, /contact-management/); assert.equal(init.method, 'GET'); assert.equal(init.body, undefined);
    return Response.json({ status: 'approved', email: 'secret' });
  } });
  assert.deepEqual(result.body, { status: 'approved' });
});

function edge(extra = {}) {
  return createInvitationPreviewHandler({ enabled: true, origin, preview: async () => ({ displayName: 'Sender', expiresAt: '2027-01-01T00:00:00Z', consentVersion: '2026-10-19' }),
    logger: { write() {} }, now: () => 0, ...extra });
}
const request = (path, method = 'GET', body, requestOrigin = origin) => new Request(`https://api.test/v3/${path}`, {
  method, headers: { Origin: requestOrigin, 'Content-Type': 'application/json' }, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) });

test('public enrollment GETs never call verification, begin or withdrawal', async () => {
  let writes = 0;
  const handler = edge({ join: { begin: async () => writes++, verify: async () => writes++ },
    management: { withdraw: async () => writes++, status: async () => ({ status: 'pending_approval' }) } });
  assert.equal((await handler(request(`contact-invitations/${TOKEN}`))).status, 200);
  assert.deepEqual(await (await handler(request(`contact-management/${MANAGEMENT}`))).json(), { status: 'pending_approval' });
  assert.equal((await handler(request(`contact-invitations/${TOKEN}/verify`))).status, 410);
  assert.equal(writes, 0);
});

test('edge requires exact origin and body allowlists; unsafe inputs never enqueue', async () => {
  let writes = 0;
  const handler = edge({ join: { begin: async () => writes++ } });
  for (const [body, requestOrigin] of [[{}, 'https://evil.test'], [{ email: 'recipient@example.test', userId: ID }, origin], [{ padding: 'x'.repeat(5000) }, origin]]) {
    assert.notEqual((await handler(request(`contact-invitations/${TOKEN}/begin`, 'POST', body, requestOrigin))).status, 200);
  }
  assert.equal(writes, 0);
});

test('accepted join survives dispatch wakeup failure and verification never approves contacts', async () => {
  const handler = edge({ join: { begin: async input => { assert.equal(input.invitationToken, TOKEN); return { attemptId: ID, expiresAt: date, withdrawalToken: MANAGEMENT }; }, verify: async () => true }, wake: async () => { throw Error('dispatch offline'); } });
  assert.equal((await handler(request(`contact-invitations/${TOKEN}/begin`, 'POST', { attemptId: ID, email: 'recipient@example.test', consent: true, consentVersion: '2026-10-19', captchaToken: 'proof', intent: 'join' }))).status, 200);
  assert.deepEqual(await (await handler(request(`contact-invitations/${TOKEN}/verify`, 'POST', { attemptId: ID, code: '012345' }))).json(), { verified: true });
});

test('Turnstile checks success, hostname, action, request binding and age; fresh challenges get independent retry keys', async () => {
  const now = Date.parse('2026-10-20T00:00:00Z');
  const good = { success: true, hostname: 'viewer.example.test', action: 'contact_join', cdata: ID, challenge_ts: new Date(now).toISOString() };
  for (const patch of [{}, { success: false }, { hostname: 'evil.test' }, { action: 'signup' }, { cdata: 'different' }, { challenge_ts: '2020-01-01' }]) {
    const verifier = createJoinCaptchaVerifier({ secret: 'private-secret', hostname: 'viewer.example.test', now: () => now,
      fetch: async (url, init) => {
        assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
        const body = JSON.parse(init.body); assert.equal(body.remoteip, undefined); assert.match(body.idempotency_key, /^[a-f0-9-]{36}$/);
        return Response.json({ ...good, ...patch });
      } });
    assert.equal(await verifier('challenge', ID), Object.keys(patch).length === 0);
  }
  const keys = [];
  const verifier = createJoinCaptchaVerifier({ secret: 'secret', hostname: 'viewer.example.test', now: () => now,
    fetch: async (_url, init) => { keys.push(JSON.parse(init.body).idempotency_key); return Response.json(good); } });
  await verifier('challenge-a', ID); await verifier('challenge-a', ID); await verifier('challenge-b', ID);
  assert.equal(keys[0], keys[1]); assert.notEqual(keys[0], keys[2]);
});

test('CAPTCHA outage and oversized responses fail closed', async () => {
  for (const fetch of [async () => { throw Error('offline'); }, async () => new Response('x'.repeat(9000)), async () => new Response('', { status: 500 })]) {
    await assert.rejects(createJoinCaptchaVerifier({ secret: 'secret', hostname: 'viewer.example.test', fetch })('token', ID));
  }
});

test('operations reports fixed join problem codes without copying recipient diagnostics', () => {
  const codes = operationalProblems({ joinVerification: { queued: 1, oldestQueuedSeconds: 90, unknown: 1, callbackOverdue: 1, deliveryReportOverdue: 1, private: 'email' } });
  for (const code of ['JOIN_VERIFICATION_QUEUE_OVERDUE','JOIN_VERIFICATION_OUTCOME_UNKNOWN','JOIN_VERIFICATION_CALLBACK_OVERDUE','JOIN_VERIFICATION_REPORT_OVERDUE']) assert.ok(codes.includes(code));
  assert.doesNotMatch(JSON.stringify(codes), /email/);
});
