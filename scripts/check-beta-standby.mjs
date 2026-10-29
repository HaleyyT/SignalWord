import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { validateBetaTarget, validateBetaPublicKey } from './beta-target.mjs';

/** Read-only configuration acceptance while enrollment is intentionally disabled.
 * This is not the enabled-flow preflight and must never imply release readiness.
 * Reports contain fixed categories only, never response bodies or credentials. */
export async function checkBetaStandby(target, fetchImpl = fetch) {
  const config = validateBetaTarget(target);
  const checks = [
    { name: 'BETA_AUTH_CONFIGURATION', path: '/api/auth/config', auth: true },
    { name: 'BETA_ENROLLMENT_DISABLED', path: '/api/enrollment/config' },
  ];
  const results = [];
  for (const check of checks) {
    const problems = [];
    try {
      const response = await fetchImpl(new URL(check.path, config.viewerOrigin), {
        method: 'GET', redirect: 'error', signal: AbortSignal.timeout(10000),
      });
      if (!response.headers.get('cache-control')?.includes('no-store')) problems.push('CACHE_POLICY_INVALID');
      const body = await response.json().catch(() => null);
      if (check.auth) {
        if (response.status !== 200 || body?.backend !== config.backendOrigin
          || body?.siteKey !== config.turnstileSiteKey || body?.minimumPasswordLength !== 10) {
          problems.push('AUTH_CONFIGURATION_MISMATCH');
        }
        try { validateBetaPublicKey(body?.publicKey, config.projectRef); }
        catch { problems.push('PUBLIC_KEY_INVALID'); }
      } else {
        if (response.status !== 503 || body?.error?.code !== 'SERVICE_UNAVAILABLE'
          || body?.siteKey !== undefined) problems.push('ENROLLMENT_NOT_DISABLED');
        if (response.headers.get('referrer-policy') !== 'no-referrer'
          || response.headers.get('x-content-type-options') !== 'nosniff') problems.push('PRIVACY_HEADERS_INVALID');
      }
      results.push({ name: check.name, passed: problems.length === 0, problems });
    } catch {
      results.push({ name: check.name, passed: false, problems: ['REQUEST_FAILED'] });
    }
  }
  return { environment: 'beta', projectRef: config.projectRef,
    standbyConfigurationPassed: results.every(result => result.passed),
    hostedLifecycleAccepted: false, testFlightReady: false, results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const target = JSON.parse(readFileSync(new URL('../config/beta-target.json', import.meta.url)));
    // Owner-only Vercel automation access is optional and never written to the report.
    const access = process.env.SIGNALWORD_BETA_VERCEL_BYPASS;
    const result = await checkBetaStandby(target, (url, options) => fetch(url, {
      ...options, headers: access ? { 'x-vercel-protection-bypass': access } : {},
    }));
    console.log(JSON.stringify(result, null, 2));
    if (!result.standbyConfigurationPassed) process.exitCode = 1;
  } catch {
    console.error('BETA_STANDBY_CHECK_REFUSED');
    process.exitCode = 1;
  }
}
