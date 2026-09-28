import { pathToFileURL } from 'node:url';

import { operationalProblems } from '../supabase/functions/_shared/operational-health.mjs';
export { operationalProblems };

export function validProblems(value) {
  return Array.isArray(value) && value.length <= 32 && value.every(code =>
    typeof code === 'string' && /^(?:[A-Z_0-9]+|SCHEDULE_UNHEALTHY:signalword-[a-z-]+)$/.test(code) && code.length <= 100);
}

export async function checkOperations({ backendOrigin, monitorKey, notificationURL, fetchImpl = fetch }) {
  const origin = new URL(backendOrigin);
  if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.username || origin.password || origin.search || origin.hash || !monitorKey) {
    throw new Error('OPERATIONAL_CONFIGURATION_INVALID');
  }
  let problems;
  try {
    const response = await fetchImpl(new URL('/functions/v1/operational-health', origin), {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${monitorKey}` },
    });
    const body = response.ok ? await response.json() : null;
    problems = validProblems(body?.problems) ? body.problems : ['HEALTH_RPC_UNAVAILABLE'];
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
    const { SIGNALWORD_BACKEND_ORIGIN: backendOrigin, SIGNALWORD_MONITOR_KEY: monitorKey,
      SIGNALWORD_OPERATOR_WEBHOOK: notificationURL, SIGNALWORD_MONITOR_HEARTBEAT_URL: heartbeatURL } = process.env;
    if (!backendOrigin || !monitorKey || !heartbeatURL) throw new Error('configuration');
    const result = await checkOperations({ backendOrigin, monitorKey, notificationURL });
    const heartbeatRecorded = await reportHeartbeat(heartbeatURL, result.problems.length === 0);
    console.log(JSON.stringify({ ...result, heartbeatRecorded }));
    if (result.problems.length || !heartbeatRecorded) process.exitCode = 1;
  } catch {
    console.error('Operational check failed. Verify backend, scoped monitor credential, heartbeat and threshold configuration in secret storage.');
    process.exitCode = 1;
  }
}
