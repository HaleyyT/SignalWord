import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { validateBetaTarget } from './beta-target.mjs';

/** Inspect only the configured beta Worker. Never invokes a tick, pings an
 * inbox, installs a credential or activates a schedule. No binding values leave
 * this function. Missing destinations are expected in standby, not readiness. */
export async function checkBetaMonitor(target, { accountId, token, fetchImpl = fetch }) {
  const config = validateBetaTarget(target);
  if (!/^[a-f0-9]{32}$/.test(accountId ?? '') || typeof token !== 'string' || !token.trim()) {
    throw Error('BETA_MONITOR_ACCESS_REQUIRED');
  }
  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${config.monitorName}/`;
  try {
    const get = async path => {
      const response = await fetchImpl(base + path, { method: 'GET', redirect: 'error',
        signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json();
      if (!response.ok || body?.success !== true || !body.result) throw Error('UNAVAILABLE');
      return body.result;
    };
    const settings = await get('settings');
    const schedules = await get('schedules');
    const bindings = Array.isArray(settings.bindings) ? settings.bindings : [];
    const backendMatches = bindings.some(b => b.name === 'BACKEND_ORIGIN' && b.type === 'plain_text' && b.text === config.backendOrigin);
    const credentialConfigured = bindings.some(b => b.name === 'MONITOR_SECRET' && b.type === 'secret_text');
    const scheduleList = Array.isArray(schedules) ? schedules : schedules.schedules;
    const scheduleInactive = Array.isArray(scheduleList) && scheduleList.length === 0;
    const notificationBindingsPresent = ['HEARTBEAT_URL', 'OPERATIONS_PING_URL'].every(name => bindings.some(b => b.name === name));
    return { worker: config.monitorName, backendMatches, credentialConfigured, scheduleInactive,
      notificationBindingsPresent, standbyConfigurationPassed: backendMatches && credentialConfigured && scheduleInactive,
      notificationDeliveryAccepted: false, testFlightReady: false };
  } catch { throw Error('BETA_MONITOR_INSPECTION_FAILED'); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const target = JSON.parse(readFileSync(new URL('../config/beta-target.json', import.meta.url)));
    const result = await checkBetaMonitor(target, { accountId: process.env.CLOUDFLARE_ACCOUNT_ID, token: process.env.CLOUDFLARE_API_TOKEN });
    console.log(JSON.stringify(result, null, 2));
    if (!result.standbyConfigurationPassed) process.exitCode = 1;
  } catch { console.error('BETA_MONITOR_INSPECTION_REFUSED'); process.exitCode = 1; }
}
