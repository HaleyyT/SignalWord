import { proxyEnrollment } from './enrollment/[token].mjs';
import { proxyPublicEvent } from './v1/public/events/[token].mjs';
import { proxyContactConfirmation } from './v1/contacts/confirm/[token].mjs';
const headers = {'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'};
const failure = status => ({status,headers,body:{error:{code:'INVALID_REQUEST'}}});
/** Tokens live only in bounded POST bodies, never in either provider's request URL. */
export async function privateLinkProxy({envelope, requestOrigin, publicOrigin, enrollmentOrigin, eventOrigin, confirmationOrigin, enabled, fetchImpl = fetch}) {
  if (!publicOrigin || requestOrigin !== publicOrigin) return failure(403);
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope) || Object.keys(envelope).some(k=>!['kind','token','action','payload'].includes(k))) return failure(400);
  const {kind,token,action,payload={}}=envelope;
  if (typeof token !== 'string' || typeof action !== 'string') return failure(400);
  const transport = (legacyURL, options) => {
    const legacy = new URL(legacyURL);
    // Selected proxies validate origin and token first. Only the fixed endpoint travels over the network.
    const prefix = legacy.pathname.slice(0, legacy.pathname.lastIndexOf(kind === 'event' || kind === 'confirmation' ? '/v1/' : '/v3/'));
    legacy.pathname = prefix + '/private-links'; legacy.search=''; legacy.hash='';
    return fetchImpl(legacy, {...options,method:'POST',headers:{...options.headers,'Content-Type':'application/json',Origin:publicOrigin},body:JSON.stringify({kind,token,action,payload})});
  };
  if (kind === 'event' && ['read','acknowledge'].includes(action)) return proxyPublicEvent({token,upstreamOrigin:eventOrigin,method:action==='read'?'GET':'POST',fetchImpl:transport});
  if (kind === 'confirmation' && ['confirm','withdraw'].includes(action)) return proxyContactConfirmation({token,upstreamOrigin:confirmationOrigin,action,fetchImpl:transport});
  if (['invitation','management'].includes(kind) && (kind === 'invitation' ? ['read','begin','verify'] : ['read','withdraw']).includes(action)) {
    if (!(kind==='invitation' ? /^[A-Za-z0-9_-]{43}$/ : /^[a-f0-9]{64}$/).test(token)) return failure(410);
    return proxyEnrollment({token,method:action==='read'?'GET':'POST',action,body:payload,requestOrigin,publicOrigin,upstreamOrigin:enrollmentOrigin,enabled,fetchImpl:transport});
  }
  return failure(400);
}
export default async function handler(request,response) {
  for(const [k,v] of Object.entries(headers)) response.setHeader(k,v);
  if(request.method!=='POST') {response.status(405).json(failure(405).body);return;}
  if(request.headers['content-type']?.split(';')[0]!=='application/json' || Number(request.headers['content-length']??0)>8192) {response.status(400).json(failure(400).body);return;}
  let body=request.body;
  try {
    if(body===undefined) {const chunks=[];let n=0;for await(const chunk of request) {n+=Buffer.byteLength(chunk);if(n>8192)throw Error();chunks.push(Buffer.from(chunk));}body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}
    else if(typeof body==='string') {if(Buffer.byteLength(body)>8192)throw Error();body=JSON.parse(body);}
    if(Buffer.byteLength(JSON.stringify(body))>8192)throw Error();
  }catch{response.status(400).json(failure(400).body);return;}
  const result=await privateLinkProxy({envelope:body,requestOrigin:request.headers.origin,publicOrigin:process.env.CONTACT_INVITATION_ORIGIN,
    enrollmentOrigin:process.env.SIGNALWORD_ENROLLMENT_ORIGIN,eventOrigin:process.env.SIGNALWORD_PUBLIC_EVENT_ORIGIN,
    confirmationOrigin:process.env.SIGNALWORD_CONTACT_CONFIRM_ORIGIN,enabled:process.env.CONTACT_ENROLLMENT_ENABLED==='true'});
  for(const[k,v]of Object.entries(result.headers))response.setHeader(k,v);
  response.status(result.status).json(result.body);
}
