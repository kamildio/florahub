import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {totp} from '../lib/maxiflora/staff-security.mjs';
// Local Worker must explicitly use synthetic owner/key variables; never run against the live site.
const base=process.env.MAXIFLORA_TEST_URL||'http://127.0.0.1:5174';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw new Error('MFA setup tests require a local synthetic environment.');
const workspace='staff-security-'+randomUUID(),headers={'Content-Type':'application/json',Origin:base,'x-maxiflora-test-workspace':workspace};let checks=0;
async function call(path,body,cookie='',status=200){const r=await fetch(base+'/api/platform/'+path,{headers:{...headers,...(cookie?{Cookie:cookie}:{})},...(body?{method:'POST',body:JSON.stringify(body)}:{})});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));assert.match(r.headers.get('cache-control'),/no-store/);return {data,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
const check=s=>{checks++;console.log('✓ '+s)};
await call('staff-security',null,'',401);await call('staff-security',{action:'begin'},'',401);
const buyer=(await call('demo',{role:'buyer'})).cookie,owner=(await call('demo',{role:'supplier'})).cookie;
await call('staff-security',{action:'begin',ownerId:'demo-buyer',encryptionKey:'aa'.repeat(32)},buyer,403);assert.equal((await call('state',null,buyer)).data.staffSecurity,null);check('Authentication and server-only owner assignment are enforced');
let state=(await call('staff-security',null,owner)).data.staffSecurity;assert.equal(state.eligible,true);assert.equal(state.enrolled,false);
const setup=(await call('staff-security',{action:'begin'},owner)).data;assert.equal(setup.secret.length,32);
const duplicate=await call('staff-security',{action:'begin'},owner,429);assert.ok(duplicate.data.error);
let hidden=JSON.stringify((await call('staff-security',null,owner)).data);assert.ok(!hidden.includes(setup.secret));assert.ok(!hidden.includes('ciphertext'));check('Enrollment is explicit, rate-limited and absent from status payloads');
const code=await totp(setup.secret),confirmed=(await call('staff-security',{action:'confirm',setupId:setup.setupId,code},owner)).data;assert.equal(confirmed.recoveryCodes.length,10);assert.equal(confirmed.ok,true);
await call('staff-security',{action:'confirm',setupId:setup.setupId,code},owner,409);state=(await call('staff-security',null,owner)).data.staffSecurity;assert.equal(state.confirmed,true);assert.equal(state.fresh,true);check('A first valid authenticator code enrolls the owner and returns ten recovery codes once');
const second=(await call('demo',{role:'supplier'})).cookie;assert.equal((await call('staff-security',null,second)).data.staffSecurity.confirmed,false);
assert.equal((await call('staff-security',{action:'verify',code},second)).data.ok,false);check('A different password session needs its own second factor and cannot replay the consumed TOTP');
const competing=await Promise.all([owner,second].map(cookie=>call('staff-security',{action:'recover',code:confirmed.recoveryCodes[0]},cookie)));assert.deepEqual(competing.map(x=>x.data.ok).sort(),[false,true]);assert.equal((await call('staff-security',null,owner)).data.staffSecurity.recoveryRemaining,9);check('CAS commits a recovery code only once even when two sessions submit it concurrently');
const outcomes=await Promise.all(Array.from({length:6},()=>call('staff-security',{action:'recover',code:'invalid'},owner)));assert.ok(outcomes.some(x=>x.data.retryAt));state=(await call('staff-security',null,owner)).data.staffSecurity;assert.equal(state.recoveryRemaining,9);check('Concurrent failed attempts persist and trigger the shared account throttle');
const ordinary=(await call('state',null,buyer)).data,own=(await call('state',null,owner)).data;for(const data of [ordinary,own]){const raw=JSON.stringify(data);assert.ok(!raw.includes(setup.secret));assert.ok(!raw.includes('recoveryHashes'));assert.ok(!raw.includes('ciphertext'));for(const c of confirmed.recoveryCodes)assert.ok(!raw.includes(c));}
assert.equal(ordinary.staffSecurity,null);check('Buyer and owner state projections never expose setup secrets or recovery material');
await call('staff-security',{action:'lock'},owner);assert.equal((await call('staff-security',null,owner)).data.staffSecurity.confirmed,false);
const r=await fetch(base+'/api/platform/staff-security',{method:'POST',headers:{...headers,Origin:'https://example.invalid',Cookie:owner},body:JSON.stringify({action:'begin'})});assert.equal(r.status,403);check('Lock ends staff confirmation and foreign origins are rejected');
console.log(checks+' staff-security API checks passed');
