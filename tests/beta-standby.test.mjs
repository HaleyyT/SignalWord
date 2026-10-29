import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkBetaStandby } from '../scripts/check-beta-standby.mjs';

const target = JSON.parse(readFileSync(new URL('../config/beta-target.json', import.meta.url)));
const publicKey = 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({ role: 'anon', ref: target.projectRef })).toString('base64url') + '.fixture';
const headers = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff' };
const auth = { backend: `https://${target.projectRef}.supabase.co`, siteKey: target.turnstileSiteKey, minimumPasswordLength: 10, publicKey };
const reply = (url, overrides = {}) => url.pathname.includes('/auth/')
  ? Response.json({ ...auth, ...overrides }, { headers })
  : Response.json({ error: { code: 'SERVICE_UNAVAILABLE' } }, { status: 503, headers });

test('standby acceptance only reads config and never declares TestFlight readiness', async () => {
  const calls = [];
  const result = await checkBetaStandby(target, (url, options) => {
    calls.push({ url, options }); return reply(url);
  });
  assert.equal(result.standbyConfigurationPassed, true);
  assert.equal(result.hostedLifecycleAccepted, false);
  assert.equal(result.testFlightReady, false);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(({ options }) => options.method === 'GET' && options.redirect === 'error' && !options.body));
  assert.ok(!JSON.stringify(result).includes(publicKey));
});

test('wrong backend, widget, password policy or public key fails standby acceptance', async () => {
  for (const overrides of [{ backend: 'https://wrong.supabase.co' }, { siteKey: 'wrong' },
    { minimumPasswordLength: 8 }, { publicKey: 'invalid' }]) {
    const result = await checkBetaStandby(target, url => reply(url, overrides));
    assert.equal(result.standbyConfigurationPassed, false);
  }
});

test('enabled enrollment, login redirects, missing privacy policy and network errors cannot pass', async () => {
  for (const fetchImpl of [
    async () => Response.json({ siteKey: target.turnstileSiteKey }, { headers }),
    async () => new Response('<html>sign in</html>', { status: 302 }),
    async () => Response.json({ error: { code: 'SERVICE_UNAVAILABLE' } }, { status: 503 }),
    async () => { throw Error('private-token-or-response'); },
  ]) {
    const result = await checkBetaStandby(target, fetchImpl);
    assert.equal(result.standbyConfigurationPassed, false);
    assert.ok(!JSON.stringify(result).includes('private-token'));
  }
});

test('production target is rejected before making any request', async () => {
  await assert.rejects(checkBetaStandby({ ...target, projectRef: 'voepalyamwgenceawdvl' }, () => {
    assert.fail('must not request production');
  }), /BETA_TARGET_NOT_CONFIGURED/);
});
