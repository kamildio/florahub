// Scheduler adapter. No credentials belong in this file or command arguments.
// Provide MAXIFLORA_MAINTENANCE_SECRET and, on owner-private Sites,
// MAXIFLORA_SERVICE_TOKEN through the scheduler's secret store.
const url=process.env.MAXIFLORA_URL;
if(!url||!process.env.MAXIFLORA_MAINTENANCE_SECRET)throw new Error('Set MAXIFLORA_URL and MAXIFLORA_MAINTENANCE_SECRET.');
let after='';let checked=0,changed=0;
for(let page=0;page<1000;page++){
 const headers={'Content-Type':'application/json','x-maxiflora-maintenance':process.env.MAXIFLORA_MAINTENANCE_SECRET};
 if(process.env.MAXIFLORA_SERVICE_TOKEN)headers['OAI-Sites-Authorization']='Bearer '+process.env.MAXIFLORA_SERVICE_TOKEN;
 const r=await fetch(new URL('/api/platform/maintenance',url),{method:'POST',headers,body:JSON.stringify({after}),signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw new Error('Maintenance returned '+r.status);
 const d=await r.json();checked+=d.checked;changed+=d.changed;if(!d.next){console.log(JSON.stringify({checked,changed}));process.exit(0)}after=d.next;
}
throw new Error('Maintenance page limit reached. Continue from the last cursor with a bounded worker.');
