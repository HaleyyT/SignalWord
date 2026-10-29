import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkBetaMonitor } from '../scripts/check-beta-monitor.mjs';

const target = JSON.parse(readFileSync(new URL('../config/beta-target.json', import.meta.url)));
const access = { accountId: 'a'.repeat(32), token: 'private-fixture-key' };
const bindings = [
  { name: 'BACKEND_ORIGIN', type: 'plain_text', text: `https://${target.projectRef}.supabase.co` },
  { name: 'MONITOR_SECRET', type: 'secret_text' },
];
const fixture = (configured = bindings, schedules = []) => async url =>
  Response.json({ success: true, result: url.endsWith('/settings') ? { bindings: configured } : { schedules } });

test('monitor inspection uses beta-only GETs and cannot claim notification acceptance', async () => {
  const requests = [];
  const result = await checkBetaMonitor(target, { ...access, fetchImpl: (url, options) => {
    requests.push({ url, options }); return fixture()(url);
  } });
  assert.equal(result.standbyConfigurationPassed, true);
  assert.equal(result.notificationBindingsPresent, false);
  assert.equal(result.notificationDeliveryAccepted, false);
  assert.equal(result.testFlightReady, false);
  assert.equal(requests.length, 2);
  assert.ok(requests.every(({ url, options }) => url.includes('/signalword-beta-monitor/') && options.method === 'GET' && options.redirect === 'error'));
  assert.ok(!JSON.stringify(result).includes(access.token));
});

test('wrong backend, absent credential, active or unknown schedules fail standby', async () => {
  for (const fetchImpl of [fixture(bindings.slice(0, 1)), fixture([{ ...bindings[0], text: 'https://wrong.example' }, bindings[1]]),
    fixture(bindings, [{ cron: '* * * * *' }]), fixture(bindings, null)]) {
    const result = await checkBetaMonitor(target, { ...access, fetchImpl });
    assert.equal(result.standbyConfigurationPassed, false);
  }
});

test('provider failures are redacted and invalid targets cannot make requests', async () => {
  await assert.rejects(checkBetaMonitor(target, { ...access, fetchImpl: async () => { throw Error(access.token); } }),
    { message: 'BETA_MONITOR_INSPECTION_FAILED' });
  await assert.rejects(checkBetaMonitor({ ...target, projectRef: 'voepalyamwgenceawdvl' }, {
    ...access, fetchImpl: () => assert.fail('production request'),
  }), /BETA_TARGET_NOT_CONFIGURED/);
  await assert.rejects(checkBetaMonitor(target, { accountId: access.accountId }), /BETA_MONITOR_ACCESS_REQUIRED/);
});
