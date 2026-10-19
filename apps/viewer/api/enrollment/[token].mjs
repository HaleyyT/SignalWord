const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'" };
const invitation = /^[A-Za-z0-9_-]{43}$/;
const management = /^[a-f0-9]{64}$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const failure = (status = 503) => ({ status, headers, body: { error: { code: status === 429 ? 'RATE_LIMITED' : status === 410 ? 'LINK_UNAVAILABLE' : status < 500 ? 'INVALID_REQUEST' : 'SERVICE_UNAVAILABLE' } } });

export async function proxyEnrollment({ token, method, action, body, requestOrigin, publicOrigin, upstreamOrigin, enabled,
  siteKey, allowLocalhost = false, fetchImpl = fetch }) {
  if (!enabled) return failure();
  if (!['GET','POST'].includes(method)) return failure(405);
  if (token === 'config' && method === 'GET') return /^[A-Za-z0-9_-]{10,100}$/.test(siteKey ?? '')
    ? { status: 200, headers, body: { siteKey } } : failure();
  if (!invitation.test(token) && !management.test(token)) return failure(410);
  let origin, upstream;
  try { origin = new URL(publicOrigin); upstream = new URL(upstreamOrigin); } catch { return failure(); }
  const validOrigin = url => !url.username && !url.password && !url.search && !url.hash
    && (url.protocol === 'https:' || (allowLocalhost && url.protocol === 'http:' && ['127.0.0.1','localhost'].includes(url.hostname)));
  if (!validOrigin(origin) || origin.origin !== publicOrigin || !validOrigin(upstream)) return failure();
  if (method === 'POST' && requestOrigin !== publicOrigin) return failure(403);
  const isManagement = management.test(token);
  if (method === 'POST' && ((!isManagement && !['begin','verify'].includes(action)) || (isManagement && action !== 'withdraw'))) return failure(400);
  if (method === 'POST' && (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body)) > 4096)) return failure(400);
  const endpoint = isManagement ? `contact-management/${token}` : `contact-invitations/${token}${method === 'POST' ? '/' + action : ''}`;
  try {
    const response = await fetchImpl(`${upstream.toString().replace(/\/$/, '')}/v3/${endpoint}`, { method, redirect: 'error',
      signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json', Origin: publicOrigin, ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
      ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) });
    const reader = response.body?.getReader();
    if (!reader) return failure();
    const decoder = new TextDecoder(); let text = '', length = 0;
    try {
      while (true) { const chunk = await reader.read(); if (chunk.done) break;
        length += chunk.value.byteLength; if (length > 8192) { void reader.cancel().catch(() => {}); return failure(); }
        text += decoder.decode(chunk.value, { stream: true }); }
    } finally { reader.releaseLock(); }
    const row = JSON.parse(text + decoder.decode());
    if (!response.ok) return failure([400,403,405,410,429].includes(response.status) ? response.status : 503);
    let projected;
    if (isManagement && method === 'POST' && row?.withdrawn === true) projected = { withdrawn: true };
    else if (isManagement && method === 'GET' && ['pending_email','pending_approval','approved','withdrawal_pending','withdrawn','expired'].includes(row?.status)) projected = { status: row.status };
    else if (action === 'verify' && row?.verified === true) projected = { verified: true };
    else if (action === 'begin' && uuid.test(row?.attemptId) && date(row?.expiresAt) && management.test(row?.withdrawalToken)) projected = { attemptId: row.attemptId, expiresAt: row.expiresAt, withdrawalToken: row.withdrawalToken };
    else if (method === 'GET' && typeof row?.displayName === 'string' && row.displayName.trim().length > 0
      && row.displayName.length <= 80 && date(row.expiresAt) && row.consentVersion === '2026-10-19') projected = { displayName: row.displayName, expiresAt: row.expiresAt, consentVersion: row.consentVersion };
    return projected ? { status: 200, headers, body: projected } : failure();
  } catch { return failure(); }
}

export default async function handler(request, response) {
  for (const [key,value] of Object.entries(headers)) response.setHeader(key,value);
  let body = request.body;
  if (request.method === 'POST') {
    if (request.headers['content-type']?.split(';')[0] !== 'application/json' || Number(request.headers['content-length'] ?? 0) > 4096) {
      response.status(400).json(failure(400).body); return;
    }
    try {
      if (body === undefined) {
        const chunks = []; let length = 0;
        for await (const chunk of request) { length += Buffer.byteLength(chunk); if (length > 4096) throw Error('BODY_TOO_LARGE'); chunks.push(Buffer.from(chunk)); }
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } else if (typeof body === 'string') { if (Buffer.byteLength(body) > 4096) throw Error('BODY_TOO_LARGE'); body = JSON.parse(body); }
    } catch { response.status(400).json(failure(400).body); return; }
  }
  const result = await proxyEnrollment({ token: typeof request.query.token === 'string' ? request.query.token : '',
    method: request.method, action: request.headers['x-signalword-action'], body, requestOrigin: request.headers.origin,
    publicOrigin: process.env.CONTACT_INVITATION_ORIGIN, upstreamOrigin: process.env.SIGNALWORD_ENROLLMENT_ORIGIN,
    enabled: process.env.CONTACT_ENROLLMENT_ENABLED === 'true', siteKey: process.env.CONTACT_TURNSTILE_SITE_KEY,
    allowLocalhost: process.env.APP_ENV === 'development' });
  response.status(result.status).json(result.body);
}
