import test from 'node:test';
import assert from 'node:assert/strict';
import { operationalProblems, checkOperations } from '../scripts/check-operations.mjs';
const healthy = () => ({ dispatchConfigured: true,
  delivery: { queued: 0, unknown: 0, oldestQueuedSeconds: 0, expiredLeases: 0 },
  contactDelivery: { queued: 0, unknown: 0, oldestQueuedSeconds: 0, expiredLeases: 0 },
  schedules: ['signalword-dispatch-sweep','signalword-delivery-lease-recovery','signalword-hourly-retention']
    .map(name => ({ name, active: true, lastSuccessAt: new Date().toISOString() })),
});
test('operational readiness fails closed for missing configuration, invalid metrics, and stopped schedules', () => {
  assert.deepEqual(operationalProblems(healthy()), []);
  assert.ok(operationalProblems(null).length > 0);
  const health = healthy(); health.dispatchConfigured = false;
  health.delivery.unknown = 1; health.contactDelivery.oldestQueuedSeconds = 61;
  health.schedules[0].active = false;
  assert.deepEqual(operationalProblems(health), ['DISPATCH_CONFIGURATION_MISSING','ALERT_OUTCOME_UNKNOWN','CONTACT_QUEUE_OVER_60_SECONDS','SCHEDULE_UNHEALTHY:signalword-dispatch-sweep']);
});
test('operator notification contains only safe problem codes and handles notification outage', async () => {
  const calls = [];
  const result = await checkOperations({ backendOrigin: 'https://backend.example', serviceKey: 'secret', notificationURL: 'https://operator.example/hook',
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      if (calls.length === 1) throw new Error('secret URL with private payload');
      return new Response(null, { status: 503 });
    },
  });
  assert.deepEqual(result, { problems: ['HEALTH_RPC_UNAVAILABLE'], notified: false });
  assert.ok(!calls[1].init.body.includes('secret'));
  assert.ok(!('Authorization' in calls[1].init.headers));
});
test('a healthy check does not send an operator message', async () => {
  let requests = 0;
  const result = await checkOperations({ backendOrigin: 'https://backend.example', serviceKey: 'secret', notificationURL: 'https://operator.example/hook',
    fetchImpl: async () => { requests++; return Response.json(healthy()); },
  });
  assert.equal(requests, 1);
  assert.deepEqual(result.problems, []);
});
