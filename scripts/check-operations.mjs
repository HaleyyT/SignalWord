import { pathToFileURL } from 'node:url';

const schedules = new Map([
  ['signalword-dispatch-sweep', 180],
  ['signalword-delivery-lease-recovery', 180],
  ['signalword-hourly-retention', 4500],
]);
const nonnegative = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** Interpret aggregate health without copying any server-provided free text. */
export function operationalProblems(health, now = Date.now(), { maximumSignups = 100, maximumInvitations = 200 } = {}) {
  const problems = [];
  if (health?.dispatchConfigured !== true) problems.push('DISPATCH_CONFIGURATION_MISSING');
  for (const [key, label] of [['delivery', 'ALERT'], ['contactDelivery', 'CONTACT']]) {
    const value = health?.[key];
    if (!value || !['queued', 'unknown', 'oldestQueuedSeconds', 'expiredLeases'].every(field => nonnegative(value[field]))) {
      problems.push(`${label}_METRICS_INVALID`);
      continue;
    }
    if (value.unknown > 0) problems.push(`${label}_OUTCOME_UNKNOWN`);
    if (value.oldestQueuedSeconds > 60) problems.push(`${label}_QUEUE_OVER_60_SECONDS`);
    if (value.expiredLeases > 0) problems.push(`${label}_LEASE_EXPIRED`);
  }
  for (const [name, maximumAge] of schedules) {
    const row = Array.isArray(health?.schedules) ? health.schedules.find(row => row?.name === name) : null;
    const last = typeof row?.lastSuccessAt === 'string' ? Date.parse(row.lastSuccessAt) : NaN;
    if (row?.active !== true || !Number.isFinite(last) || last > now || now - last > maximumAge * 1000) {
      problems.push(`SCHEDULE_UNHEALTHY:${name}`);
    }
  }
  const dispatch = health?.dispatchHTTP;
  const completed = Date.parse(dispatch?.lastCompletedAt ?? '');
  if (!dispatch || !Number.isFinite(completed) || completed > now || now - completed > 180_000 ||
      !Number.isInteger(dispatch.lastStatus) || dispatch.lastStatus < 200 || dispatch.lastStatus >= 300 ||
      dispatch.timedOut !== false || !nonnegative(dispatch.overdue) || dispatch.overdue > 0) {
    problems.push('DISPATCH_HTTP_UNHEALTHY');
  }
  if (!nonnegative(health?.abuse?.signupsLastHour) || !nonnegative(health?.abuse?.invitationsLastHour)) {
    problems.push('ABUSE_METRICS_INVALID');
  } else {
    if (health.abuse.signupsLastHour > maximumSignups) problems.push('SIGNUP_VOLUME_HIGH');
    if (health.abuse.invitationsLastHour > maximumInvitations) problems.push('INVITATION_VOLUME_HIGH');
  }
  return problems;
}

export async function checkOperations({ backendOrigin, serviceKey, notificationURL, limits, fetchImpl = fetch }) {
  const origin = new URL(backendOrigin);
  if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.username || origin.password || origin.search || origin.hash || !serviceKey) {
    throw new Error('OPERATIONAL_CONFIGURATION_INVALID');
  }
  let problems;
  try {
    const response = await fetchImpl(new URL('/rest/v1/rpc/signalword_operational_health', origin), {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10_000),
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' }, body: '{}',
    });
    problems = response.ok ? operationalProblems(await response.json(), Date.now(), limits) : ['HEALTH_RPC_UNAVAILABLE'];
  } catch { problems = ['HEALTH_RPC_UNAVAILABLE']; }

  let notified = false;
  if (problems.length && notificationURL) {
    // Configure a dedicated operator webhook accepting this small JSON contract.
    // No event IDs or secret-bearing request data are copied into notifications.
    try {
      const destination = new URL(notificationURL);
      if (destination.protocol !== 'https:' || destination.username || destination.password) throw new Error();
      const response = await fetchImpl(destination, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10_000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: 'SignalWord', severity: 'critical', problems }),
      });
      notified = response.ok;
    } catch { /* The caller must fail visibly when the notification path fails. */ }
  }
  return { problems, notified };
}

/** An external dead-man check also detects when this monitor stops running. */
export async function reportHeartbeat(heartbeatURL, healthy, fetchImpl = fetch) {
  try {
    const url = new URL(heartbeatURL);
    if (url.protocol !== 'https:' || url.hostname !== 'hc-ping.com' || url.port || url.username || url.password ||
        url.search || url.hash || !/^\/[0-9a-f-]{36}$/.test(url.pathname)) return false;
    if (!healthy) url.pathname += '/fail';
    const response = await fetchImpl(url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10_000) });
    // This provider can return 200 with a non-OK body for an unknown check.
    return response.ok && (await response.text()).trim() === 'OK';
  } catch { return false; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { SIGNALWORD_BACKEND_ORIGIN: backendOrigin, SIGNALWORD_SERVICE_ROLE_KEY: serviceKey,
      SIGNALWORD_OPERATOR_WEBHOOK: notificationURL, SIGNALWORD_MONITOR_HEARTBEAT_URL: heartbeatURL } = process.env;
    if (!backendOrigin || !serviceKey || !heartbeatURL) throw new Error('configuration');
    const limits = { maximumSignups: Number(process.env.SIGNALWORD_MAX_SIGNUPS_PER_HOUR ?? 100),
      maximumInvitations: Number(process.env.SIGNALWORD_MAX_INVITATIONS_PER_HOUR ?? 200) };
    if (!Object.values(limits).every(value => Number.isSafeInteger(value) && value > 0)) throw new Error('configuration');
    const result = await checkOperations({ backendOrigin, serviceKey, notificationURL, limits });
    const heartbeatRecorded = await reportHeartbeat(heartbeatURL, result.problems.length === 0);
    console.log(JSON.stringify({ ...result, heartbeatRecorded }));
    if (result.problems.length || !heartbeatRecorded) process.exitCode = 1;
  } catch {
    console.error('Operational check failed. Verify backend, service credential, heartbeat and threshold configuration in secret storage.');
    process.exitCode = 1;
  }
}
