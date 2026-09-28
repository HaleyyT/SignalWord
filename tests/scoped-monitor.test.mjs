import test from 'node:test';
import assert from 'node:assert/strict';
import {createHealthHandler} from '../supabase/functions/operational-health/index.ts';
import {Monitor} from '../infrastructure/monitor/worker.mjs';
const key='fixture-monitor-key-which-is-at-least-32-characters';
test('scoped health rejects invalid credentials before database access and supports rotation',async()=>{
 let reads=0; const handler=createHealthHandler({key,previousKey:key+'old',read:async()=>{reads++;return {private:'sensitive@example.test'};}});
 assert.equal((await handler(new Request('https://example.test'))).status,401);assert.equal(reads,0);
 for(const token of [key,key+'old']) {
  const response=await handler(new Request('https://example.test',{headers:{Authorization:`Bearer ${token}`}}));
  assert.equal(response.status,200);assert.ok(!(await response.text()).includes('sensitive'));
 }
});
test('monitor deduplicates incidents, retries failed notifications, and reports recovery',async()=>{
 const original=globalThis.fetch;const storage=new Map();let problems=['ALERT_OUTCOME_UNKNOWN'],fail=true;const notifications=[];
 globalThis.fetch=async(url,init)=>{
  if(String(url).includes('operational-health')) {assert.equal(init.headers.Authorization,`Bearer ${key}`);assert.ok(!init.headers.apikey);return Response.json({problems});}
  if(String(url).includes('operator.example')) {notifications.push(JSON.parse(init.body));return new Response(null,{status:fail?503:200});}
  return new Response('OK');
 };
 const monitor=new Monitor({blockConcurrencyWhile:fn=>fn(),storage:{get:async k=>storage.get(k),put:async(k,v)=>storage.set(k,v)}},
 {BACKEND_ORIGIN:'https://backend.example',MONITOR_SECRET:key,OPERATOR_WEBHOOK:'https://operator.example',HEARTBEAT_URL:'https://hc-ping.com/00000000-0000-4000-8000-000000000001'});
 try {
  assert.equal((await monitor.fetch()).status,503);assert.equal(storage.size,0);
  fail=false;await monitor.fetch();await monitor.fetch();assert.equal(notifications.length,2);
  problems=[];await monitor.fetch();await monitor.fetch();assert.equal(notifications.length,3);assert.equal(notifications[2].state,'recovered');
 }finally{globalThis.fetch=original;}
});
