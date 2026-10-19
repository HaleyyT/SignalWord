import test from 'node:test';
import assert from 'node:assert/strict';
import { createContactJoinService, generateJoinCode, runContactJoinEmail } from '../supabase/functions/_shared/contact-join.ts';
import { createJoinCodeProtection, createInvitationTokenCipher, createContactDataProtection } from '../supabase/functions/_shared/encryption.ts';
import { sha256Hex } from '../supabase/functions/_shared/tokens.ts';
import { ResendDeliveryAdapter, renderJoinCodeEmail, createJoinManagementUrl } from '../supabase/functions/_shared/resend.ts';

const ID = 'a4000000-0000-4000-8000-000000000001';
const OTHER = 'a4000000-0000-4000-8000-000000000002';
const TOKEN = 'a'.repeat(43);
const HASH = await sha256Hex(TOKEN);
const KEY = Buffer.alloc(32, 21).toString('base64url');
const PEPPER = Buffer.alloc(32, 22).toString('base64url');
const input = { invitationToken: TOKEN, attemptId: ID, email: ' Recipient@Example.test ', consent: true,
  consentVersion: '2026-10-19', captchaToken: 'captcha-proof' };
const options = { url: 'https://api.example.test', serviceRoleKey: 'private-service-key', encryptionKey: KEY,
  fingerprintKey: PEPPER, keyVersion: 1, provider: 'fake', environment: 'test',
  verifyCaptcha: async () => true, generateCode: () => '012345' };
const proof = createJoinCodeProtection(KEY, PEPPER, 1);
function service(fetch, overrides = {}) { return createContactJoinService({ ...options, fetch, ...overrides }); }
function response(value, status = 200) { return Response.json(value, { status }); }

test('codes are six digits and sampled using cryptographic randomness', () => {
  const values = new Set(Array.from({ length: 100 }, generateJoinCode));
  for (const code of values) assert.match(code, /^\d{6}$/);
  assert.ok(values.size > 90);
});

test('code proofs bind invitation, attempt, pepper and leading zeroes', async () => {
  const original = await proof.hash(ID, HASH, '012345');
  assert.match(original, /^[0-9a-f]{64}$/);
  for (const variant of [await proof.hash(OTHER, HASH, '012345'), await proof.hash(ID, 'b'.repeat(64), '012345'),
    await proof.hash(ID, HASH, '012346'), await createJoinCodeProtection(KEY, KEY, 1).hash(ID, HASH, '012345')]) {
    assert.notEqual(variant, original);
  }
});

test('encrypted codes cannot be swapped across attempts, invitations, purposes or keys', async () => {
  const ciphertext = await proof.encrypt(ID, HASH, '012345');
  assert.equal(await proof.decrypt(ciphertext, 1, ID, HASH), '012345');
  await assert.rejects(proof.decrypt(ciphertext, 1, OTHER, HASH));
  await assert.rejects(proof.decrypt(ciphertext, 1, ID, 'b'.repeat(64)));
  await assert.rejects(proof.decrypt(ciphertext, 2, ID, HASH));
  await assert.rejects(createJoinCodeProtection(PEPPER, PEPPER, 1).decrypt(ciphertext, 1, ID, HASH));
  await assert.rejects(proof.decrypt(await createInvitationTokenCipher(KEY, 1).encrypt(TOKEN), 1, ID, HASH));
});

test('recipient must explicitly accept current terms and supply valid email before CAPTCHA or storage', async () => {
  let calls = 0;
  const api = service(async () => { calls++; }, { verifyCaptcha: async () => { calls++; return true; } });
  for (const patch of [{ consent: false }, { consentVersion: 'old' }, { email: 'bad' }, { email: 'a'.repeat(255) },
    { captchaToken: '' }, { attemptId: 'invalid' }, { invitationToken: 'invalid' }]) {
    await assert.rejects(api.begin({ ...input, ...patch }), error => error.status === 400);
  }
  assert.equal(calls, 0);
});

test('failed or unavailable CAPTCHA cannot enqueue email', async () => {
  let calls = 0;
  for (const verifyCaptcha of [async () => false, async () => 'true', async () => { throw new Error('provider diagnostic'); }]) {
    await assert.rejects(service(async () => { calls++; }, { verifyCaptcha }).begin(input));
  }
  assert.equal(calls, 0);
});

test('begin encrypts recipient and code, fingerprints normalized email, returns only safe fields', async () => {
  let body;
  const api = service(async (url, init) => {
    assert.match(url, /\/begin_contact_join$/);
    assert.equal(init.redirect, 'error');
    body = JSON.parse(init.body);
    assert.doesNotMatch(init.body, /Recipient@|recipient@example|012345|captcha-proof/);
    return response({ attemptId: ID, expiresAt: '2026-10-19T00:10:00Z', code: 'private', recipient: 'private' });
  });
  const withdrawalToken = await proof.withdrawalToken(ID, HASH);
  assert.deepEqual(await api.begin(input), { attemptId: ID, expiresAt: '2026-10-19T00:10:00Z', withdrawalToken });
  assert.equal(body.p_withdrawal_hash, `\\x${await sha256Hex(withdrawalToken)}`);
  const contacts = createContactDataProtection(KEY, PEPPER, 1);
  assert.equal(await contacts.decryptDestination(body.p_destination_ciphertext, 1), 'recipient@example.test');
  assert.equal(body.p_destination_fingerprint, `\\x${await contacts.fingerprintDestination('recipient@example.test')}`);
  assert.equal(await proof.decrypt(body.p_code_payload_ciphertext, 1, ID, HASH), '012345');
  assert.equal(body.p_code_hash, `\\x${await proof.hash(ID, HASH, '012345')}`);
  assert.equal(body.p_consent_accepted, true);
});

test('unavailable links and database errors do not leak raw recipient/provider diagnostics', async () => {
  for (const [value, status, expected] of [[null, 200, 410], [{ message: 'RATE_LIMITED' }, 400, 429],
    [{ message: 'private-recipient-diagnostic' }, 500, 503]]) {
    await assert.rejects(service(async () => response(value, status)).begin(input), error => {
      assert.equal(error.status, expected);
      assert.doesNotMatch(error.message, /private-recipient/);
      return true;
    });
  }
});

test('malformed begin results and network failures fail closed', async () => {
  for (const fetch of [async () => response({ attemptId: OTHER, expiresAt: '2026-10-19T00:10:00Z' }),
    async () => response({ attemptId: ID, expiresAt: 'invalid' }), async () => { throw new Error('private'); }]) {
    await assert.rejects(service(fetch).begin(input), error => error.status === 503);
  }
});

test('verification sends only the bound HMAC; failed verification stays false', async () => {
  for (const result of [true, false]) {
    const api = service(async (url, init) => {
      assert.match(url, /\/verify_contact_join$/);
      const body = JSON.parse(init.body);
      assert.equal(body.p_code_hash, `\\x${await proof.hash(ID, HASH, '012345')}`);
      assert.doesNotMatch(init.body, /012345/);
      return response(result);
    });
    assert.equal(await api.verify(TOKEN, ID, '012345'), result);
  }
  await assert.rejects(service(async () => response('true')).verify(TOKEN, ID, '012345'), error => error.status === 503);
});

test('malformed code inputs never reach the database', async () => {
  let calls = 0;
  const api = service(async () => { calls++; });
  for (const code of ['12345', '1234567', 'abcdef', '123 45', '']) await assert.rejects(api.verify(TOKEN, ID, code));
  assert.equal(calls, 0);
});

test('fake delivery cannot be configured in production', () => {
  assert.throws(() => service(async () => response(null), { environment: 'production' }), /Fake delivery/);
});

const claimed = { attemptId: ID, invitationHash: HASH, senderName: 'Sender', provider: 'fake',
  destinationCiphertext: 'ciphertext', destinationKeyVersion: 1, payloadCiphertext: 'payload', payloadKeyVersion: 1 };
function worker({ claim = claimed, decrypt, send, finish } = {}) {
  const finished = [], sends = [];
  const deps = { leaseId: OTHER, service: {
    claimEmail: async () => claim,
    decryptEmail: decrypt ?? (async () => ({ recipient: 'recipient@example.test', code: '012345', withdrawalToken: 'a'.repeat(64) })),
    finishEmail: finish ?? (async (...args) => { finished.push(args); return true; }),
  }, adapter: { provider: 'fake', sendJoinCode: send ?? (async value => { sends.push(value); return { providerMessageId: 'fake/receipt' }; }) } };
  return { run: () => runContactJoinEmail(deps), finished, sends };
}

test('worker sends once with stable idempotency and finalizes the leased attempt', async () => {
  const task = worker();
  assert.equal(await task.run(), 'sent');
  assert.deepEqual(task.sends, [{ recipient: 'recipient@example.test', code: '012345', withdrawalToken: 'a'.repeat(64), senderName: 'Sender', idempotencyKey: `contact/join/${ID}` }]);
  assert.deepEqual(task.finished, [[ID, OTHER, 'sent', 'fake/receipt']]);
});

test('idle queue sends nothing', async () => {
  const task = worker({ claim: null });
  assert.equal(await task.run(), 'idle');
  assert.equal(task.sends.length, 0);
  assert.equal(task.finished.length, 0);
});

test('bad encrypted payload or provider mismatch cannot send email', async () => {
  for (const overrides of [{ decrypt: async () => { throw new Error('bad ciphertext'); } }, { claim: { ...claimed, provider: 'resend' } }]) {
    const task = worker(overrides);
    assert.equal(await task.run(), 'failed');
    assert.equal(task.sends.length, 0);
    assert.equal(task.finished[0][2], 'failed');
  }
});

test('provider ambiguity or malformed receipt is never automatically retried', async () => {
  for (const send of [async () => { throw new Error('timeout after acceptance'); }, async () => ({ providerMessageId: '' })]) {
    const task = worker({ send });
    assert.equal(await task.run(), 'unknown');
    assert.equal(task.finished[0][2], 'unknown');
  }
});

test('accepted email with lost finalization is never re-sent by worker', async () => {
  for (const finish of [async () => false, async () => { throw new Error('database timeout'); }]) {
    let sends = 0;
    const task = worker({ finish, send: async () => { sends++; return { providerMessageId: 'receipt' }; } });
    assert.equal(await task.run(), 'lease_lost');
    assert.equal(sends, 1);
  }
});

test('claim and finish gateway allowlist results and reject malformed types', async () => {
  const api = service(async url => response(url.endsWith('/claim_contact_join_email') ? { ...claimed, secret: 'hidden' } : true));
  assert.deepEqual(await api.claimEmail(OTHER), claimed);
  assert.equal(await api.finishEmail(ID, OTHER, 'sent', 'receipt'), true);
  await assert.rejects(service(async () => response({ ...claimed, invitationHash: 'bad' })).claimEmail(OTHER));
  await assert.rejects(service(async () => response('true')).finishEmail(ID, OTHER, 'unknown'));
});

test('recipient-requested email identifies inviter, bounds expiry, avoids marketing and escapes untrusted names', () => {
  const email = renderJoinCodeEmail('<Sender>\r\nInjected', '012345', 'https://example.test/manage-contact/' + 'a'.repeat(64));
  assert.equal(email.subject, 'Your SignalWord email verification code');
  assert.match(email.text, /You requested/);
  assert.match(email.text, /10 minutes/);
  assert.match(email.text, /does not activate alerts/);
  assert.match(email.text, /did not request/);
  assert.match(email.text, /withdraw consent after approval/);
  assert.match(email.text, /No app or account is needed/);
  assert.doesNotMatch(email.html, /<Sender>/);
  assert.match(email.html, /&lt;Sender&gt;/);
  assert.doesNotMatch(email.subject, /Injected/);
  assert.throws(() => renderJoinCodeEmail('Sender', '12345'));
});

test('Resend join adapter uses existing idempotency and sanitized correlation tag without real network', async () => {
  const adapter = new ResendDeliveryAdapter({ apiKey: 're_' + 'a'.repeat(20), from: 'SignalWord <mail@example.test>',
    publicViewerBaseUrl: 'https://example.test', publicConfirmationBaseUrl: 'https://example.test', environment: 'test' },
  async (url, init) => {
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(init.headers['Idempotency-Key'], `contact/join/${ID}`);
    const message = JSON.parse(init.body);
    assert.deepEqual(message.to, ['recipient@example.test']);
    assert.match(message.text, /012345/);
    assert.doesNotMatch(JSON.stringify(message.tags), /012345|recipient@example/);
    assert.match(message.html, /manage-contact\//);
    return response({ id: 'provider-receipt' });
  });
  assert.deepEqual(await adapter.sendJoinCode({ recipient: 'recipient@example.test', code: '012345', withdrawalToken: 'a'.repeat(64), senderName: 'Sender',
    idempotencyKey: `contact/join/${ID}` }), { providerMessageId: 'provider-receipt' });
});

test('management links reject invalid capability, credentials, query, fragment and production HTTP', () => {
  assert.equal(createJoinManagementUrl('https://example.test', 'a'.repeat(64), 'production'), `https://example.test/manage-contact/${'a'.repeat(64)}`);
  for (const url of ['http://example.test', 'https://user:pass@example.test', 'https://example.test?tracking=1', 'https://example.test#fragment']) {
    assert.throws(() => createJoinManagementUrl(url, 'a'.repeat(64), 'production'));
  }
  assert.throws(() => createJoinManagementUrl('https://example.test', 'invalid', 'production'));
});
