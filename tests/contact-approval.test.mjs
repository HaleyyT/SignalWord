import test from 'node:test';
import assert from 'node:assert/strict';
import { createContactApprovalGateway } from '../supabase/functions/_shared/contact-approval.ts';
import { createJoinCodeProtection } from '../supabase/functions/_shared/encryption.ts';
import { sha256Hex } from '../supabase/functions/_shared/tokens.ts';

const USER = 'c1000000-0000-4000-8000-000000000001';
const INVITE = 'c2000000-0000-4000-8000-000000000001';
const ATTEMPT = 'c3000000-0000-4000-8000-000000000001';
const CONTACT = 'c4000000-0000-4000-8000-000000000001';
const TOKEN = 'a'.repeat(64);
const candidate = { attemptId: ATTEMPT, verifiedAt: '2026-10-19T01:00:00Z', expiresAt: '2026-10-19T01:30:00Z',
  destinationCiphertext: 'private-ciphertext', destinationKeyVersion: 1 };
function gateway(overrides = {}) {
  return createContactApprovalGateway({ url: 'https://api.example.test', anonKey: 'public-key', serviceRoleKey: 'private-key',
    authenticate: async () => ({ id: USER }), decryptDestination: async () => 'recipient@example.test',
    flushJournal: async () => {}, fetch: async () => Response.json(null), ...overrides });
}

test('withdrawal capability is stable for retry and bound to a secret, invitation and attempt', async () => {
  const key = Buffer.alloc(32, 27).toString('base64url');
  const other = Buffer.alloc(32, 28).toString('base64url');
  const codes = createJoinCodeProtection(key, key, 1);
  const token = await codes.withdrawalToken(ATTEMPT, TOKEN);
  assert.match(token, /^[0-9a-f]{64}$/);
  assert.equal(await codes.withdrawalToken(ATTEMPT, TOKEN), token);
  assert.notEqual(await codes.withdrawalToken(INVITE, TOKEN), token);
  assert.notEqual(await codes.withdrawalToken(ATTEMPT, 'b'.repeat(64)), token);
  assert.notEqual(await createJoinCodeProtection(key, other, 1).withdrawalToken(ATTEMPT, TOKEN), token);
  assert.notEqual(await codes.hash(ATTEMPT, TOKEN, '000000'), token);
});

test('review verifies the current owner session before privileged lookup and masks recipient email', async () => {
  const order = [];
  const api = gateway({ authenticate: async jwt => { assert.equal(jwt, 'owner-jwt'); order.push('auth'); return { id: USER }; },
    fetch: async (url, init) => {
      order.push('rpc'); assert.match(url, /review_contact_joins$/);
      assert.deepEqual(JSON.parse(init.body), { p_user_id: USER, p_invitation_id: INVITE });
      assert.equal(init.headers.Authorization, 'Bearer private-key');
      return Response.json([{ ...candidate, withdrawalToken: 'secret', userId: USER }]);
    } });
  const result = await api.review('owner-jwt', INVITE);
  assert.deepEqual(order, ['auth', 'rpc']);
  assert.deepEqual(result, [{ attemptId: ATTEMPT, verifiedAt: candidate.verifiedAt, expiresAt: candidate.expiresAt,
    emailHint: 'r***@example.test' }]);
  assert.doesNotMatch(JSON.stringify(result), /recipient@|ciphertext|secret|userId/);
});

test('invalid owner sessions cannot review or approve', async () => {
  let calls = 0;
  const api = gateway({ authenticate: async () => { throw new Error('session revoked'); }, fetch: async () => { calls++; } });
  await assert.rejects(api.review('invalid-jwt', INVITE));
  await assert.rejects(api.approve('invalid-jwt', INVITE, ATTEMPT));
  assert.equal(calls, 0);
});

test('approval carries owner JWT rather than service privileges and projects only contact status', async () => {
  const api = gateway({ fetch: async (url, init) => {
    assert.match(url, /approve_contact_join$/);
    assert.equal(init.headers.Authorization, 'Bearer owner-jwt');
    assert.equal(init.headers.apikey, 'public-key');
    assert.deepEqual(JSON.parse(init.body), { p_user_id: USER, p_invitation_id: INVITE, p_attempt_id: ATTEMPT, p_name: 'Travel buddy' });
    return Response.json({ contactId: CONTACT, status: 'confirmed', withdrawalToken: 'secret', email: 'private' });
  } });
  assert.deepEqual(await api.approve('owner-jwt', INVITE, ATTEMPT, ' Travel buddy '), { contactId: CONTACT, status: 'confirmed' });
});

test('stale proof and invalid inputs cannot be reported as approved', async () => {
  await assert.rejects(gateway().approve('owner-jwt', INVITE, ATTEMPT), error => error.status === 409);
  let calls = 0;
  const api = gateway({ fetch: async () => { calls++; } });
  await assert.rejects(api.approve('owner-jwt', 'invalid', ATTEMPT));
  await assert.rejects(api.approve('owner-jwt', INVITE, ATTEMPT, ''));
  assert.equal(calls, 0);
});

test('withdrawal hashes its private token and confirms only after durable journal flush', async () => {
  const calls = [];
  const api = gateway({ fetch: async (url, init) => {
    calls.push('rpc'); assert.match(url, /withdraw_contact_join$/);
    assert.deepEqual(JSON.parse(init.body), { p_withdrawal_hash: `\\x${await sha256Hex(TOKEN)}` });
    assert.doesNotMatch(init.body, new RegExp(TOKEN));
    return Response.json({ withdrawn: true, userId: USER });
  }, flushJournal: async userId => { calls.push('journal'); assert.equal(userId, USER); } });
  assert.deepEqual(await api.withdraw(TOKEN), { withdrawn: true });
  assert.deepEqual(calls, ['rpc', 'journal']);
});

test('interrupted journal flush does not acknowledge restore-safe withdrawal', async () => {
  const api = gateway({ fetch: async () => Response.json({ withdrawn: true, userId: USER }),
    flushJournal: async () => { throw new Error('journal unavailable'); } });
  await assert.rejects(api.withdraw(TOKEN), error => error.status === 503);
});

test('unknown withdrawal capability and malformed backend results fail safely', async () => {
  await assert.rejects(gateway().withdraw(TOKEN), error => error.status === 410);
  await assert.rejects(gateway().withdraw('invalid'), error => error.status === 410);
  await assert.rejects(gateway({ fetch: async () => Response.json({ withdrawn: true }) }).withdraw(TOKEN), error => error.status === 503);
  await assert.rejects(gateway({ fetch: async () => Response.json({ contactId: 'bad', status: 'confirmed' }) }).approve('jwt', INVITE, ATTEMPT));
});

test('candidate decryption, malformed rows and raw provider failures do not leak data', async () => {
  for (const overrides of [{ fetch: async () => Response.json([{ ...candidate, expiresAt: 'bad' }]) },
    { fetch: async () => Response.json([candidate]), decryptDestination: async () => { throw new Error('private email'); } },
    { fetch: async () => Response.json({ message: 'private database diagnostic' }, { status: 500 }) }]) {
    await assert.rejects(gateway(overrides).review('jwt', INVITE), error => {
      assert.equal(error.status, 503); assert.doesNotMatch(error.message, /private/); return true;
    });
  }
});
