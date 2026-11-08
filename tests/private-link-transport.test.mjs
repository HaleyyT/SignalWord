import test from 'node:test';
import assert from 'node:assert/strict';
import { privateLinkProxy } from '../apps/viewer/api/private-links.mjs';
import { withPrivateLinkTransport } from '../supabase/functions/_shared/private-link-transport.ts';
const token='a'.repeat(43), management='b'.repeat(64), origin='https://beta.example.test';
const config={requestOrigin:origin,publicOrigin:origin,enrollmentOrigin:'https://beta.supabase.co/functions/v1/contact-invitation-preview',eventOrigin:'https://beta.supabase.co/functions/v1/public-event',confirmationOrigin:'https://beta.supabase.co/functions/v1/contact-confirm',enabled:true};
for(const [kind,action,capability,payload,result,path,method] of [
 ['invitation','read',token,{}, {displayName:'Haley',expiresAt:'2099-01-01T00:00:00Z',consentVersion:'2026-10-19'},'/v3/contact-invitations/'+token,'GET'],
 ['invitation','begin',token,{attemptId:'10000000-0000-4000-8000-000000000001',email:'fixture@example.test',consent:true,consentVersion:'2026-10-19',captchaToken:'proof',intent:'join'},{attemptId:'10000000-0000-4000-8000-000000000001',expiresAt:'2099-01-01T00:00:00Z',withdrawalToken:management},'/v3/contact-invitations/'+token+'/begin','POST'],
 ['invitation','verify',token,{attemptId:'10000000-0000-4000-8000-000000000001',code:'012345'},{verified:true},'/v3/contact-invitations/'+token+'/verify','POST'],
 ['management','read',management,{}, {status:'approved'},'/v3/contact-management/'+management,'GET'],
 ['management','withdraw',management,{}, {withdrawn:true},'/v3/contact-management/'+management,'POST'],
 ['event','read',token,{}, {event:{kind:'test'}},'/v1/public/events/'+token,'GET'],
 ['event','acknowledge',token,{}, {acknowledged:true},'/v1/public/events/'+token,'POST'],
 ['confirmation','withdraw',token,{}, {withdrawn:true},'/v1/contacts/confirm/'+token,'POST'],
]) test(`fixed transport preserves ${kind}/${action} without capabilities in network URL`,async()=>{
 let calls=0;
 const handler=withPrivateLinkTransport(async request=>{
   assert.equal(new URL(request.url).pathname,path);assert.equal(request.method,method);
   if(kind==='invitation' && method==='POST')assert.deepEqual(await request.json(),payload);
   if(action==='acknowledge' || (kind==='confirmation' && action==='withdraw'))assert.equal(request.headers.get('X-SignalWord-Action'),action);
   return Response.json(result);
 },[kind]);
 const response=await privateLinkProxy({...config,envelope:{kind,action,token:capability,payload},fetchImpl:async(url,options)=>{
   calls++;assert.equal(new URL(url).pathname,`/functions/v1/${kind==='event'?'public-event':kind==='confirmation'?'contact-confirm':'contact-invitation-preview'}/private-links`);
   assert.ok(!String(url).includes(capability));assert.equal(new URL(url).search,'');
   return handler(new Request(url,options));
 }});
 assert.equal(response.status,200);assert.equal(calls,1);assert.equal(response.headers['Cache-Control'],'no-store');
 });
test('cross-origin, invalid actions and malformed capabilities do not reach backend',async()=>{
 for(const edit of [{requestOrigin:'https://evil.test'}, {envelope:{kind:'event',action:'delete',token}}, {envelope:{kind:'management',action:'read',token}}, {envelope:{kind:'event',action:'read',token:'bad'}}]) {
  const r=await privateLinkProxy({...config,envelope:{kind:'event',action:'read',token},...edit,fetchImpl:()=>{throw Error('must not reach network')}});assert.notEqual(r.status,200);
 }
});
test('backend rejects cross-handler kinds and oversized transport bodies',async()=>{
 const handler=withPrivateLinkTransport(async()=>{assert.fail('not canonicalized')},['event']);
 for(const body of [{kind:'management',token:management,action:'read'}, {kind:'event',token,action:'read',payload:'x'.repeat(9000)}]) {
  const response=await handler(new Request('https://beta.test/private-links',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));assert.notEqual(response.status,200);
 }
});

// Older database projections may contain REAL guidance for TEST records.
// The public boundary must prevent that copy from reaching any client.
test('TEST guidance is rehearsal-specific, and REAL guidance is preserved', async()=>{
 const {parsePublicProjection}=await import('../supabase/functions/_shared/public-projection.ts');
 const fixture={kind:'test',displayName:'Sender',state:'active',triggeredAt:'2026-11-09T00:00:00Z',lastUpdatedAt:'2026-11-09T00:00:00Z',guidance:{summary:'Contact Sender now. Call emergency services.'}};
 assert.match(parsePublicProjection(fixture).guidance.summary,/not an emergency/);
 assert.match(parsePublicProjection({...fixture,state:'resolved'}).guidance.summary,/No action is required/);
 assert.match(parsePublicProjection({...fixture,state:'expired'}).guidance.summary,/expired/);
 assert.deepEqual(parsePublicProjection({...fixture,kind:'real'}).guidance,fixture.guidance);
});
