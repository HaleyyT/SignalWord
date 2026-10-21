const productionRef = 'voepalyamwgenceawdvl';

/** Checked-in target is an explicit operator decision, never inferred from a CLI link. */
export function validateBetaTarget(target) {
  if (target?.environment !== 'beta' || target.status !== 'configured'
    || !/^[a-z]{20}$/.test(target.projectRef ?? '') || target.projectRef === productionRef) {
    throw Error('BETA_TARGET_NOT_CONFIGURED');
  }
  let url;
  try { url = new URL(target.viewerOrigin); } catch { throw Error('BETA_WEBSITE_INVALID'); }
  if (url.protocol !== 'https:' || url.origin !== target.viewerOrigin || url.username || url.password
    || !url.hostname.endsWith('.vercel.app')) throw Error('BETA_WEBSITE_INVALID');
  if (!/^[A-Za-z0-9_-]{10,100}$/.test(target.turnstileSiteKey ?? '')
    || target.turnstileSiteKey === '0x4AAAAAAFFb3ETKlwBxFCNF') throw Error('BETA_WIDGET_INVALID');
  if (target.vercelProjectId !== 'prj_PgsRJyPYMJmpMUULlAS5jnMrAmv2'
    || target.authorityName !== 'signalword-beta-safety-authority'
    || target.journalBucket !== 'signalword-beta-deletion-journal'
    || target.monitorName !== 'signalword-beta-monitor') throw Error('BETA_RESOURCE_MISMATCH');
  return { ...target, backendOrigin: `https://${target.projectRef}.supabase.co` };
}

export function validateBetaPublicKey(key, ref) {
  if (/^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(key)) return;
  try {
    const parts = key.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (parts.length === 3 && parts[0].startsWith('eyJ') && payload.role === 'anon' && payload.ref === ref) return;
  } catch { /* Report only a fixed category; never print the supplied key. */ }
  throw Error('BETA_PUBLIC_KEY_INVALID');
}
