import { checkOperations, reportHeartbeat } from '../../scripts/check-operations.mjs';

/** One Durable Object serializes scheduled probes and retains notification state. */
export class Monitor {
  constructor(state,env) { this.state=state;this.env=env; }
  async fetch() {
    return this.state.blockConcurrencyWhile(async()=>{
      const result=await checkOperations({backendOrigin:this.env.BACKEND_ORIGIN,monitorKey:this.env.MONITOR_SECRET});
      const problems=[...new Set(result.problems)].sort();
      const fingerprint=JSON.stringify(problems);
      const previous=await this.state.storage.get('reported');
      let notificationOK=true;
      // A failed notification is deliberately not recorded; the next tick retries.
      if (fingerprint!==previous && (problems.length || previous!==undefined)) {
        notificationOK=await notify(this.env.OPERATOR_WEBHOOK,{service:'SignalWord',state:problems.length?'incident':'recovered',problems});
        if(notificationOK) await this.state.storage.put('reported',fingerprint);
      } else if(previous===undefined) await this.state.storage.put('reported',fingerprint);
      const heartbeatOK=await reportHeartbeat(this.env.HEARTBEAT_URL,problems.length===0 && notificationOK);
      return Response.json({healthy:problems.length===0 && notificationOK && heartbeatOK},{status:notificationOK && heartbeatOK?200:503});
    });
  }
}
async function notify(address,body) {
  try {
    const url=new URL(address);
    if(url.protocol!=='https:' || url.username || url.password) return false;
    const response=await fetch(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(5000),headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    return response.ok;
  } catch { return false; }
}
export default {
  async scheduled(_event,env,ctx) {
    const monitor=env.MONITOR.get(env.MONITOR.idFromName('signalword-dev'));
    ctx.waitUntil(monitor.fetch('https://internal.invalid/tick'));
  },
  // There is no public probe or administration endpoint.
  fetch() { return new Response(null,{status:404}); }
};
