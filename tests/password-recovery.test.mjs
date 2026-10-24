import test from 'node:test';
import assert from 'node:assert/strict';
import authConfigHandler from '../apps/viewer/api/auth/config.mjs';
import {recoveryToken,recoveryClient,recoveryOrigin} from '../apps/viewer/public/auth/recovery-client.js';
const token='a'.repeat(64), configuration={backend:'https://voepalyamwgenceawdvl.supabase.co',publicKey:'fixture-public'};
test('Only correctly typed recovery hashes are accepted',()=>{
 assert.equal(recoveryToken('#token_hash='+token+'&type=recovery'),token);
 for(const value of ['#access_token=unsafe','#token_hash='+token+'&type=email','#token_hash=wrong&type=recovery'])assert.equal(recoveryToken(value),null);
});
test('Recovery is verified once on explicit update, then changes the existing account and revokes only that session',async()=>{
 const calls=[];const client=recoveryClient(configuration,async(url,options)=>{
 calls.push({url,options});return Response.json(url.endsWith('/verify')?{access_token:'recovery-session'}:{});
 });
 assert.equal(calls.length,0);await client.update(token,'fixture-password');
 assert.equal(calls.length,3);assert.deepEqual(JSON.parse(calls[0].options.body),{token_hash:token,type:'recovery'});
 assert.equal(calls[1].options.method,'PUT');assert.equal(calls[1].options.headers.Authorization,'Bearer recovery-session');
 assert.ok(calls[2].url.endsWith('/logout?scope=local'));
});
test('Expired or reused links cannot update an account',async()=>{
 let count=0;const client=recoveryClient(configuration,async()=>{count++;return Response.json({code:'otp_expired'},{status:403});});
 await assert.rejects(client.update(token,'fixture-password'),/LINK_OR_PASSWORD_NOT_ACCEPTED/);assert.equal(count,1);
});
test('Reset request includes CAPTCHA and exact HTTPS recovery redirect',async()=>{
 const client=recoveryClient(configuration,async(url,options)=>{
 assert.equal(new URL(url).searchParams.get('redirect_to'),recoveryOrigin);
 assert.deepEqual(JSON.parse(options.body),{email:'fixture@example.test',gotrue_meta_security:{captcha_token:'proof'}});return Response.json({});
 });await client.request('fixture@example.test','proof');
});
test('Recovery refuses another backend and classifies quota rejection',async()=>{
 assert.throws(()=>recoveryClient({...configuration,backend:'http://localhost:3000'}),/CONFIGURATION/);
 const client=recoveryClient(configuration,async()=>Response.json({},{status:429}));
 await assert.rejects(client.request('fixture@example.test','proof'),/RATE_LIMITED/);
});


test('beta recovery enforces the configured password policy before consuming a one-time link',async()=>{
 let calls=0;
 const client=recoveryClient({...configuration,minimumPasswordLength:10},async url=>{
  calls++;return Response.json(url.endsWith('/verify')?{access_token:'fixture-session'}:{});
 });
 assert.equal(client.minimumPasswordLength,10);
 for(const password of ['12345678','123456789','😀'.repeat(5)]) {
  await assert.rejects(client.update(token,password),/INPUT/);
 }
 assert.equal(calls,0);
 await client.update(token,'1234567890');assert.equal(calls,3);
 assert.equal(recoveryClient(configuration).minimumPasswordLength,8);
 for(const minimumPasswordLength of [0,7,129,8.5,'10']) {
  assert.throws(()=>recoveryClient({...configuration,minimumPasswordLength}),/CONFIGURATION/);
 }
});


test('auth configuration publishes only a valid deployment-specific password minimum',()=>{
 const originalKey=process.env.SIGNALWORD_SUPABASE_PUBLIC_KEY, originalMinimum=process.env.SIGNALWORD_AUTH_MIN_PASSWORD_LENGTH;
 const payload=Buffer.from(JSON.stringify({role:'anon',ref:'voepalyamwgenceawdvl'})).toString('base64url');
 process.env.SIGNALWORD_SUPABASE_PUBLIC_KEY=`fixture.${payload}.fixture`;
 const read=()=>{const response={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;}};authConfigHandler({method:'GET'},response);return response;};
 try {
  delete process.env.SIGNALWORD_AUTH_MIN_PASSWORD_LENGTH;assert.equal(read().body.minimumPasswordLength,8);
  process.env.SIGNALWORD_AUTH_MIN_PASSWORD_LENGTH='10';assert.equal(read().body.minimumPasswordLength,10);
  for(const invalid of ['','0','7','129','8.5','not-a-number']) {
   process.env.SIGNALWORD_AUTH_MIN_PASSWORD_LENGTH=invalid;assert.equal(read().code,503);
  }
 }finally{
  if(originalKey===undefined)delete process.env.SIGNALWORD_SUPABASE_PUBLIC_KEY;else process.env.SIGNALWORD_SUPABASE_PUBLIC_KEY=originalKey;
  if(originalMinimum===undefined)delete process.env.SIGNALWORD_AUTH_MIN_PASSWORD_LENGTH;else process.env.SIGNALWORD_AUTH_MIN_PASSWORD_LENGTH=originalMinimum;
 }
});
