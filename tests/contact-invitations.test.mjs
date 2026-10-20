import test from 'node:test';
import assert from 'node:assert/strict';
import { createUserApiHandler } from '../supabase/functions/user-api/index.ts';
import { createInvitationPreviewHandler } from '../supabase/functions/contact-invitation-preview/index.ts';
import { createContactInvitationGateway, createInvitationPreviewGateway } from '../supabase/functions/_shared/contact-invitations.ts';
import { createInvitationTokenCipher, createDeliveryPayloadCipher } from '../supabase/functions/_shared/encryption.ts';
import { ApiError } from '../supabase/functions/_shared/http.ts';
import { sha256Hex } from '../supabase/functions/_shared/tokens.ts';

const USER = 'a1000000-0000-4000-8000-000000000001';
const INVITATION = 'a2000000-0000-4000-8000-000000000001';
const REQUEST_KEY = 'a3000000-0000-4000-8000-000000000001';
const TOKEN = 'a'.repeat(43);
const OTHER_TOKEN = 'b'.repeat(43);
const KEY = Buffer.alloc(32, 17).toString('base64url');
const NOW = Date.parse('2026-10-19T00:00:00Z');
const base = { invitationId: INVITATION, displayName: 'Sender', status: 'open', expiresAt: '2026-10-20T00:00:00Z' };

function request({ method = 'POST', path = '', body = {}, authenticated = true, key = REQUEST_KEY } = {}) {
  return new Request(`https://api.example.test/user-api/v3/contact-invitations${path}`, {
    method, headers: { ...(authenticated ? { Authorization: 'Bearer sender-jwt' } : {}),
      'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
  });
}

function handler(invitations, logs = [], authenticate = async () => ({ id: USER })) {
  // Dependencies outside the invitation boundary deliberately have no methods;
  // touching the legacy contact/email paths makes these tests fail.
  return createUserApiHandler({ backend: { authenticate }, lifecycle: {}, delivery: {}, invitations,
    logger: { write: event => logs.push(event) }, now: () => NOW });
}

function previewRequest(token = TOKEN, method = 'GET') {
  return new Request(`https://api.example.test/contact-invitation-preview/v3/contact-invitations/${token}`, { method });
}

test('invitation endpoints are unavailable unless explicitly configured', async () => {
  const response = await handler(undefined)(request());
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'SERVICE_UNAVAILABLE');
});

test('creating an invitation requires a verified sender session', async () => {
  let calls = 0;
  const response = await handler({ create: async () => { calls++; } })(request({ authenticated: false }));
  assert.equal(response.status, 401);
  assert.equal(calls, 0);
});

test('invalid sender session cannot mint invitations', async () => {
  let calls = 0;
  const response = await handler({ create: async () => { calls++; } }, [], async () => {
    throw new ApiError(401, 'AUTH_REQUIRED', 'Authentication is required.');
  })(request());
  assert.equal(response.status, 401);
  assert.equal(calls, 0);
});

test('creation rejects recipient details, arrays, null and identity injection', async () => {
  let calls = 0;
  for (const body of [{ email: 'someone@example.test' }, { name: 'Someone' }, { userId: USER }, [], null, { recipient: {} }]) {
    const response = await handler({ create: async () => { calls++; } })(request({ body }));
    assert.equal(response.status, 400);
  }
  assert.equal(calls, 0);
});

test('creation requires header idempotency and bounds incoming body size', async () => {
  let calls = 0;
  for (const input of [{ key: null }, { key: 'invalid' }, { body: { padding: 'x'.repeat(17_000) } }]) {
    const response = await handler({ create: async () => { calls++; } })(request(input));
    assert.equal(response.status, 400);
  }
  assert.equal(calls, 0);
});

test('creation uses authenticated identity and returns an allowlisted result', async () => {
  const calls = [], logs = [];
  const response = await handler({ create: async (...args) => {
    calls.push(args);
    return { ...base, shareURL: `https://www.example.test/join/${TOKEN}`,
      tokenHash: 'private-hash', tokenCiphertext: 'private-ciphertext', userId: USER, email: 'private@example.test' };
  } }, logs)(request());
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [[USER, REQUEST_KEY]]);
  assert.deepEqual(await response.json(), { ...base, shareURL: `https://www.example.test/join/${TOKEN}` });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.doesNotMatch(JSON.stringify(logs), new RegExp(`${TOKEN}|${USER}|${REQUEST_KEY}|private`));
});

test('listing hides recovery material and share links even if upstream returns them', async () => {
  let args;
  const response = await handler({ list: async (...value) => {
    args = value;
    return [{ ...base, shareURL: `https://www.example.test/join/${TOKEN}`, tokenCiphertext: 'private' }];
  } })(request({ method: 'GET' }));
  assert.equal(response.status, 200);
  assert.deepEqual(args, [USER, 'sender-jwt']);
  assert.deepEqual(await response.json(), [base]);
});

test('revoke is owner-scoped; missing and other-owner invitations remain indistinguishable', async () => {
  let args;
  const ok = await handler({ revoke: async (...value) => { args = value; return true; } })(request({ method: 'DELETE', path: `/${INVITATION}` }));
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { revoked: true });
  assert.deepEqual(args, [USER, INVITATION, 'sender-jwt']);
  const missing = await handler({ revoke: async () => false })(request({ method: 'DELETE', path: `/${INVITATION}` }));
  assert.equal(missing.status, 404);
});

test('unsupported invitation methods do not mutate anything', async () => {
  for (const input of [{ method: 'PUT' }, { method: 'POST', path: `/${INVITATION}` }]) {
    const response = await handler({})(request(input));
    assert.equal(response.status, 405);
  }
});

test('malformed upstream invitation responses fail closed without echoing details', async () => {
  for (const result of [{ ...base, invitationId: 'bad' }, { ...base, expiresAt: 'bad' },
    { ...base, shareURL: 'https://attacker.example.test/?private=data' }, { ...base, status: 'confirmed' }]) {
    const response = await handler({ create: async () => result })(request());
    assert.equal(response.status, 503);
    assert.doesNotMatch(await response.text(), /attacker|private=data/);
  }
});

test('invitation cipher round-trips but refuses corrupted, foreign-purpose and wrong-version data', async () => {
  const cipher = createInvitationTokenCipher(KEY, 1);
  const encoded = await cipher.encrypt(TOKEN);
  assert.notEqual(encoded, TOKEN);
  assert.equal(await cipher.decrypt(encoded, 1), TOKEN);
  await assert.rejects(cipher.decrypt(encoded, 2));
  await assert.rejects(cipher.decrypt(`!${encoded.slice(1)}`, 1));
  await assert.rejects(cipher.encrypt('short'));
  const viewer = createDeliveryPayloadCipher(KEY, 1);
  await assert.rejects(cipher.decrypt(await viewer.encrypt(TOKEN), 1));
  assert.throws(() => createInvitationTokenCipher(KEY, 0));
  assert.throws(() => createInvitationTokenCipher(KEY, 32768));
});

function gatewayConfig(overrides = {}) {
  return { url: 'https://backend.example.test', anonKey: 'public-fixture', serviceRoleKey: 'service-fixture',
    publicOrigin: 'https://www.example.test', generateToken: () => OTHER_TOKEN,
    cipher: createInvitationTokenCipher(KEY, 1), ...overrides };
}

test('lost-response retry recovers original invitation capability, not the unused replacement token', async () => {
  const cipher = createInvitationTokenCipher(KEY, 1), calls = [];
  const encrypted = await cipher.encrypt(TOKEN);
  const gateway = createContactInvitationGateway(gatewayConfig({ cipher, fetch: async (url, options) => {
    calls.push({ url, ...options });
    return Response.json({ ...base, tokenCiphertext: encrypted, tokenKeyVersion: 1, tokenHash: await sha256Hex(TOKEN), extra: 'private' });
  } }));
  const first = await gateway.create(USER, REQUEST_KEY);
  const second = await gateway.create(USER, REQUEST_KEY);
  assert.deepEqual(first, { ...base, shareURL: `https://www.example.test/join/${TOKEN}` });
  assert.deepEqual(first, second);
  assert.equal(JSON.parse(calls[0].body).p_token_hash, `\\x${await sha256Hex(OTHER_TOKEN)}`);
  assert.equal(calls[0].headers.Authorization, 'Bearer service-fixture');
  assert.equal(calls[0].redirect, 'error');
  assert.doesNotMatch(JSON.stringify(first), /Ciphertext|tokenHash|service-fixture|private/);
});

test('recovered capabilities must match the stored hash', async () => {
  const cipher = createInvitationTokenCipher(KEY, 1);
  const encrypted = await cipher.encrypt(TOKEN);
  const gateway = createContactInvitationGateway(gatewayConfig({ cipher, fetch: async () => Response.json({
    ...base, tokenCiphertext: encrypted, tokenKeyVersion: 1, tokenHash: await sha256Hex(OTHER_TOKEN),
  }) }));
  await assert.rejects(gateway.create(USER, REQUEST_KEY), { code: 'SERVICE_UNAVAILABLE' });
});

test('terminal invitation retry never decrypts or returns a share link', async () => {
  const gateway = createContactInvitationGateway(gatewayConfig({ cipher: { keyVersion: 1, encrypt: async () => 'cipher', decrypt: async () => assert.fail('must not recover revoked token') },
    fetch: async () => Response.json({ ...base, status: 'revoked', tokenCiphertext: null }) }));
  assert.deepEqual(await gateway.create(USER, REQUEST_KEY), { ...base, status: 'revoked' });
});

test('share links use a fixed validated origin, with HTTP limited to explicitly allowed loopback', () => {
  for (const publicOrigin of ['http://remote.example.test', 'https://user:password@example.test',
    'https://example.test/path', 'https://example.test?redirect=elsewhere', 'https://example.test#fragment']) {
    assert.throws(() => createContactInvitationGateway(gatewayConfig({ publicOrigin })));
  }
  assert.throws(() => createContactInvitationGateway(gatewayConfig({ publicOrigin: 'http://127.0.0.1:5173' })));
  assert.doesNotThrow(() => createContactInvitationGateway(gatewayConfig({ publicOrigin: 'http://127.0.0.1:5173', allowLocalhost: true })));
});

test('list/revoke gateway preserves sender JWT instead of granting service privileges', async () => {
  const calls = [];
  const gateway = createContactInvitationGateway(gatewayConfig({ fetch: async (url, options) => {
    calls.push({ url, ...options });
    return Response.json(url.endsWith('list_contact_invitations') ? [{ ...base, tokenHash: 'private' }] : true);
  } }));
  assert.deepEqual(await gateway.list(USER, 'verified-sender-jwt'), [base]);
  assert.equal(await gateway.revoke(USER, INVITATION, 'verified-sender-jwt'), true);
  for (const call of calls) {
    assert.equal(call.headers.apikey, 'public-fixture');
    assert.equal(call.headers.Authorization, 'Bearer verified-sender-jwt');
  }
});

test('database limits become actionable API errors; transport errors remain sanitized', async () => {
  for (const [message, status, code] of [['RATE_LIMITED', 429, 'RATE_LIMITED'], ['CONTACT_LIMIT', 409, 'CONTACT_LIMIT']]) {
    const gateway = createContactInvitationGateway(gatewayConfig({ fetch: async () => Response.json({ message }, { status: 400 }) }));
    await assert.rejects(gateway.create(USER, REQUEST_KEY), { status, code });
  }
  const gateway = createContactInvitationGateway(gatewayConfig({ fetch: async () => { throw Error('private credentials or URL'); } }));
  await assert.rejects(gateway.create(USER, REQUEST_KEY), error => error.code === 'SERVICE_UNAVAILABLE' && !error.message.includes('private'));
});

test('preview hashes the capability and exposes only the inviter consent projection', async () => {
  const calls = [], logs = [];
  const response = await createInvitationPreviewHandler({ enabled: true, now: () => NOW,
    logger: { write: event => logs.push(event) }, preview: async hash => {
      calls.push(hash);
      return { displayName: 'Sender', expiresAt: base.expiresAt, consentVersion: '2026-10-19', email: 'private@example.test', userId: USER };
    } })(previewRequest());
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [await sha256Hex(TOKEN)]);
  assert.deepEqual(await response.json(), { displayName: 'Sender', expiresAt: base.expiresAt, consentVersion: '2026-10-19' });
  assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.doesNotMatch(JSON.stringify(logs), new RegExp(`${TOKEN}|${USER}|private@example`));
});

test('preview is disabled by default and never permits mutation or invalid tokens', async () => {
  let calls = 0;
  const deps = { enabled: true, logger: { write() {} }, now: () => NOW, preview: async () => { calls++; return null; } };
  assert.equal((await createInvitationPreviewHandler({ ...deps, enabled: false })(previewRequest())).status, 503);
  assert.equal((await createInvitationPreviewHandler(deps)(previewRequest(TOKEN, 'POST'))).status, 405);
  assert.equal((await createInvitationPreviewHandler(deps)(previewRequest('short'))).status, 410);
  assert.equal(calls, 0);
});

test('expired, revoked and unissued previews share the same unavailable response', async () => {
  for (const value of [null, { displayName: 'Sender', expiresAt: '2026-10-18T00:00:00Z', consentVersion: '2026-10-19' }]) {
    const response = await createInvitationPreviewHandler({ enabled: true, logger: { write() {} }, now: () => NOW, preview: async () => value })(previewRequest());
    assert.equal(response.status, 410);
    assert.equal((await response.json()).error.code, 'LINK_UNAVAILABLE');
  }
});

test('public preview gateway uses anonymous privileges and rejects arbitrary hash input', async () => {
  const calls = [];
  const preview = createInvitationPreviewGateway({ url: 'https://backend.example.test', anonKey: 'public-fixture', fetch: async (url, options) => {
    calls.push(options);
    return Response.json({ displayName: 'Sender', expiresAt: base.expiresAt, consentVersion: '2026-10-19', tokenCiphertext: 'private' });
  } });
  assert.equal(await preview('not-a-hash'), null);
  assert.equal(calls.length, 0);
  assert.deepEqual(await preview(await sha256Hex(TOKEN)), { displayName: 'Sender', expiresAt: base.expiresAt, consentVersion: '2026-10-19' });
  assert.equal(calls[0].headers.Authorization, 'Bearer public-fixture');
  assert.equal(JSON.parse(calls[0].body).p_token_hash, `\\x${await sha256Hex(TOKEN)}`);
});

test('owner review and approval routes enforce authentication, method, body and projection', async () => {
  const candidate = { attemptId: REQUEST_KEY, emailHint: 's***@example.test', verifiedAt: base.expiresAt, expiresAt: base.expiresAt };
  const calls = [];
  const make = (enabled = true) => createUserApiHandler({ backend: { authenticate: async jwt => { calls.push(['auth', jwt]); return { id: USER }; } },
    lifecycle: {}, delivery: {}, logger: { write() {} }, now: () => NOW,
    approval: enabled ? { review: async (...args) => { calls.push(['review', ...args]); return [{ ...candidate, email: 'private@example.test' }]; },
      approve: async (...args) => { calls.push(['approve', ...args]); return { contactId: INVITATION, status: 'confirmed', owner: USER }; } } : undefined });
  const review = request({ method: 'GET', path: `/${INVITATION}/candidates` });
  assert.deepEqual(await (await make()(review)).json(), [candidate]);
  const good = { attemptId: REQUEST_KEY, name: 'Sam' };
  const approved = await make()(request({ path: `/${INVITATION}/approve`, body: good }));
  assert.deepEqual(await approved.json(), { contactId: INVITATION, status: 'confirmed' });
  assert.deepEqual(calls.at(-1), ['approve', 'sender-jwt', INVITATION, REQUEST_KEY, 'Sam']);
  for (const body of [{ ...good, email: 'other@example.test' }, { ...good, userId: USER }, [], null, { ...good, name: ' ' }, { ...good, attemptId: 'bad' }]) {
    assert.equal((await make()(request({ path: `/${INVITATION}/approve`, body }))).status, 400);
  }
  assert.equal((await make()(request({ method: 'GET', path: `/${INVITATION}/approve` }))).status, 405);
  assert.equal((await make()(request({ path: `/${INVITATION}/candidates` }))).status, 405);
  assert.equal((await make()(request({ method: 'GET', path: `/${INVITATION}/candidates`, authenticated: false }))).status, 401);
  assert.equal((await make(false)(review)).status, 503);
});

test('legacy cutover rejects both sender-entered email paths before encryption or mail work', async () => {
  const h = createUserApiHandler({ backend: { authenticate: async () => ({ id: USER }) }, lifecycle: {}, network: {}, delivery: {},
    legacyContactWritesDisabled: true, logger: { write() {} }, now: () => NOW });
  for (const path of ['/v1/contacts', '/v2/contacts', `/v2/contacts/${INVITATION}`]) {
    const result = await h(new Request('https://api.example.test' + path, { method: 'POST',
      headers: { Authorization: 'Bearer sender-jwt', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'unconsented@example.test', name: 'Third party' }) }));
    assert.equal(result.status, 409);
    assert.equal((await result.json()).error.code, 'CONTACT_SETUP_CHANGED');
  }
});
