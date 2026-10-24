const backend = 'https://voepalyamwgenceawdvl.supabase.co';
export default function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') { response.status(405).json({error:'METHOD_NOT_ALLOWED'}); return; }
  const publicKey = process.env.SIGNALWORD_SUPABASE_PUBLIC_KEY ?? '';
  const minimumPasswordLength = Number(process.env.SIGNALWORD_AUTH_MIN_PASSWORD_LENGTH ?? '8');
  let claims;
  try { claims = JSON.parse(Buffer.from(publicKey.split('.')[1], 'base64url').toString()); } catch { }
  if (claims?.role !== 'anon' || claims?.ref !== 'voepalyamwgenceawdvl'
    || !Number.isInteger(minimumPasswordLength) || minimumPasswordLength < 8 || minimumPasswordLength > 128) {
    response.status(503).json({error:'AUTH_CONFIGURATION_UNAVAILABLE'}); return;
  }
  response.status(200).json({backend, publicKey, siteKey:'0x4AAAAAAFFb3ETKlwBxFCNF', minimumPasswordLength});
}
