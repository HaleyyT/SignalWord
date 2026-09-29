import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser = await chromium.launch({headless:true});
try {
 const page=await browser.newPage(); let logins=0, logouts=0;
 await page.route('https://www.signalword.app/onboarding/**',async route=>{
  const name=new URL(route.request().url()).pathname.split('/').pop();
  if(!['acceptance.html','acceptance.js','invited-session.js','verify.css'].includes(name)) throw Error('UNEXPECTED_ASSET');
  await route.fulfill({body:await readFile(new URL('../public/onboarding/'+name,import.meta.url)),contentType:name.endsWith('.html')?'text/html':name.endsWith('.css')?'text/css':'application/javascript'});
 });
 await page.route('https://challenges.cloudflare.com/**',route=>route.fulfill({contentType:'application/javascript',body:`window.turnstile={render(target,options){const b=document.createElement('button');b.textContent='Simulated human challenge';b.onclick=()=>options.callback('fixture-captcha');document.querySelector(target).appendChild(b);}};`}));
 await page.route('https://voepalyamwgenceawdvl.supabase.co/**',async route=>{
  const req=route.request(); const url=new URL(req.url());
  if(url.pathname==='/auth/v1/token') {
   logins++; assert.equal(req.postDataJSON().gotrue_meta_security.captcha_token,'fixture-captcha');
   await route.fulfill({status:logins===1?200:400,contentType:'application/json',body:JSON.stringify(logins===1?{access_token:'private-session',user:{id:'private-user'}}:{error:'private-provider-error'})});
  } else if(url.pathname==='/auth/v1/logout') {logouts++;await route.fulfill({status:204,body:''});}
  else throw Error('UNEXPECTED_NETWORK');
 });
 await page.goto('https://www.signalword.app/onboarding/acceptance.html');
 await page.locator('#fixture').setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({environment:'development',signupDisabled:true,email:'private@example.invalid',password:'private-password',publishableKey:'public-client-key'}))});
 await page.getByRole('button',{name:'Simulated human challenge'}).click();
 await page.getByRole('button',{name:'Save redacted result'}).waitFor();
 const result=JSON.parse(await page.locator('#evidence').innerText());
 assert.equal(result.passed,true);assert.equal(logins,2);assert.equal(logouts,1);
 const body=await page.locator('body').innerText();
 for(const forbidden of ['private@example.invalid','private-password','fixture-captcha','private-session','private-provider-error']) assert.ok(!body.includes(forbidden));
 assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
 assert.equal(await page.locator('#fixture').inputValue(),'');
 await page.reload();
 await page.locator('#fixture').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({environment:'production',signupDisabled:true}))});
 await page.getByRole('button',{name:'Save redacted result'}).waitFor();
 assert.equal(JSON.parse(await page.locator('#evidence').innerText()).failure,'INVALID_DEVELOPMENT_FIXTURE');
 assert.equal(logins,2);
 console.log('PASS mocked normal-browser harness: invited login, logout, token reuse rejection, redaction, no storage, wrong-environment rejection. NOT real CAPTCHA evidence.');
} finally {await browser.close();}
