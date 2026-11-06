import test from 'node:test';
import assert from 'node:assert/strict';
import {base32,totp,sealSecret,openSecret,staffSecurityAction as act,staffSecurityView as view,requireStaffConfirmation as requireMfa} from '../lib/maxiflora/staff-security.mjs';
import {seed,snapshot} from '../lib/maxiflora/engine.mjs';
const now=Date.UTC(2026,9,22,5,0,0),key='a1'.repeat(32);
const user={id:'owner-test',email:'owner@example.test',verified:true,verificationMethod:'email'};
const context=(extra={})=>({ownerId:user.id,encryptionKey:key,workspace:'live',testMode:false,sessionId:'1'.repeat(64),authenticatedAt:now,sessionExpires:now+604800000,...extra});
async function enrolled(){const s={},ctx=context(),start=await act(s,user,{action:'begin'},ctx,now),code=await totp(start.secret,now),confirmed=await act(s,user,{action:'confirm',setupId:start.setupId,code},ctx,now);return {s,ctx,start,confirmed};}
const denied=(fn,status)=>assert.rejects(fn,e=>e.status===status);

test('TOTP matches published RFC 6238 SHA-1 vectors including times beyond 32-bit Unix seconds',async()=>{
 const secret=base32(new TextEncoder().encode('12345678901234567890'));
 assert.equal(secret,'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
 for(const [time,expected] of [[59,'94287082'],[1111111109,'07081804'],[1111111111,'14050471'],[1234567890,'89005924'],[2000000000,'69279037'],[20000000000,'65353130']])assert.equal(await totp(secret,time*1000,8),expected);
});
test('counter-based implementation matches all ten RFC 4226 SHA-1 vectors',async()=>{const secret=base32(new TextEncoder().encode('12345678901234567890'));for(const [i,code] of ['755224','287082','359152','969429','338314','254676','287922','162583','399871','520489'].entries())assert.equal(await totp(secret,i*30000),code);});
test('secrets use authenticated encryption bound to the exact account and server key',async()=>{
 const ctx=context(),value=await sealSecret('SECRET',user.id,ctx);assert.equal(await openSecret(value,user.id,ctx),'SECRET');assert.notEqual(value.ciphertext,'SECRET');
 await denied(()=>openSecret(value,'another',ctx),503);await denied(()=>openSecret(value,user.id,{...ctx,encryptionKey:'b2'.repeat(32)}),503);await denied(()=>openSecret({...value,iv:'00'.repeat(12)},user.id,ctx),503);await denied(()=>sealSecret('SECRET',user.id,{...ctx,encryptionKey:undefined}),503);
});
test('owner assignment, verified email and session context cannot be supplied by request body or profile roles',async()=>{
 const ctx=context(),s={};await denied(()=>act(s,{...user,id:'outsider',role:'owner',staff:true},{action:'begin',ownerId:'outsider',encryptionKey:key},ctx,now),403);
 await denied(()=>act(s,{...user,verified:false},{action:'begin'},ctx,now),403);await denied(()=>act(s,{...user,verificationMethod:'sandbox'},{action:'begin'},ctx,now),403);
 await denied(()=>act(s,user,{action:'begin'},{...ctx,sessionId:'spoof'},now),401);await denied(()=>act(s,user,{action:'begin'},{...ctx,sessionExpires:now},now),401);
 assert.equal(view(s,{...user,id:'outsider'},ctx,now).staffSecurity,null);assert.deepEqual(s,{});
});
test('enrollment needs a recent password, a valid first code and an unexpired matching setup',async()=>{
 const s={},ctx=context();await denied(()=>act(s,user,{action:'begin'},{...ctx,authenticatedAt:now-600001},now),401);
 const start=await act(s,user,{action:'begin'},ctx,now);assert.equal(start.secret.length,32);assert.match(start.uri,/otpauth:\/\/totp\//);assert.equal(view(s,user,ctx,now).staffSecurity.enrolled,false);
 assert.equal((await act(s,user,{action:'confirm',setupId:'wrong',code:await totp(start.secret,now)},ctx,now)).ok,false);
 const success=await act(s,user,{action:'confirm',setupId:start.setupId,code:await totp(start.secret,now)},ctx,now);assert.equal(success.ok,true);assert.equal(success.recoveryCodes.length,10);assert.equal(new Set(success.recoveryCodes).size,10);
 const stored=JSON.stringify(s);assert.ok(!stored.includes(start.secret));for(const c of success.recoveryCodes)assert.ok(!stored.includes(c));assert.equal(s.staffSecurity[user.id].pending,undefined);
 await denied(async()=>act(s,user,{action:'confirm',setupId:start.setupId,code:await totp(start.secret,now)},ctx,now),409);
});
test('a successful TOTP cannot be replayed in the same or a new login; each new session needs a second factor',async()=>{
 const {s,ctx,start}=await enrolled(),other=context({sessionId:'2'.repeat(64)});assert.throws(()=>requireMfa(s,user,other,{now}),e=>e.status===401);
 assert.equal((await act(s,user,{action:'verify',code:await totp(start.secret,now)},other,now)).ok,false);
 assert.equal((await act(s,user,{action:'verify',code:await totp(start.secret,now+30000)},other,now+30000)).ok,true);assert.equal(requireMfa(s,user,other,{now:now+30000}).actorId,user.id);
 assert.equal((await act(s,user,{action:'verify',code:await totp(start.secret,now+30000)},ctx,now+30000)).ok,false);
});
test('failed attempts remain committed; restarting setup cannot reset the five-attempt limit',async()=>{
 const s={},ctx=context(),start=await act(s,user,{action:'begin'},ctx,now);for(let i=0;i<5;i++)assert.equal((await act(s,user,{action:'confirm',setupId:'bad',code:'000000'},ctx,now)).ok,false);
 const second=await act(s,user,{action:'begin'},ctx,now+60000);const blocked=await act(s,user,{action:'confirm',setupId:second.setupId,code:await totp(second.secret,now+60000)},ctx,now+60000);assert.equal(blocked.retryAt,now+300000);
 assert.equal((await act(s,user,{action:'confirm',setupId:second.setupId,code:await totp(second.secret,now+300000)},ctx,now+300000)).ok,true);assert.ok(!JSON.stringify(s.staffSecurityAudit).includes(start.secret));
});
test('setup expires and replacing a setup invalidates the former setup ID',async()=>{
 const s={},ctx=context(),a=await act(s,user,{action:'begin'},ctx,now),b=await act(s,user,{action:'begin'},ctx,now+60000);
 assert.equal((await act(s,user,{action:'confirm',setupId:a.setupId,code:await totp(a.secret,now+60000)},ctx,now+60000)).ok,false);
 const later=now+960000,fresh=context({authenticatedAt:later});assert.equal((await act(s,user,{action:'confirm',setupId:b.setupId,code:await totp(b.secret,later)},fresh,later)).ok,false);
});
test('critical confirmation expires at five minutes; lock and eight-hour expiry remove staff access',async()=>{
 const {s,ctx}=await enrolled();assert.throws(()=>requireMfa(s,user,{...ctx,encryptionKey:undefined},{now}),e=>e.status===503);assert.equal(view(s,user,{...ctx,encryptionKey:undefined},now).staffSecurity.confirmed,false);assert.ok(requireMfa(s,user,ctx,{critical:true,now:now+300000}));assert.throws(()=>requireMfa(s,user,ctx,{critical:true,now:now+300001}),e=>e.status===401);assert.ok(requireMfa(s,user,ctx,{now:now+300001}));
 assert.throws(()=>requireMfa(s,user,ctx,{now:now+28800000}),e=>e.status===401);assert.equal(view(s,user,ctx,now-1).staffSecurity.confirmed,false);
 await act(s,user,{action:'lock'},ctx,now+1000);assert.throws(()=>requireMfa(s,user,ctx,{now:now+1000}),e=>e.status===401);
});
test('recovery codes are hashed, consumed once across sessions, and rotating them invalidates the previous set',async()=>{
 const {s,ctx,start,confirmed}=await enrolled(),second=context({sessionId:'2'.repeat(64)}),third=context({sessionId:'3'.repeat(64)});
 assert.equal((await act(s,user,{action:'recover',code:confirmed.recoveryCodes[0]},second,now+1000)).ok,true);assert.equal(view(s,user,second,now+1000).staffSecurity.recoveryRemaining,9);
 assert.equal((await act(s,user,{action:'recover',code:confirmed.recoveryCodes[0]},third,now+1000)).ok,false);
 const rotated=await act(s,user,{action:'rotate-recovery',code:await totp(start.secret,now+30000)},ctx,now+30000);assert.equal(rotated.recoveryCodes.length,10);
 assert.equal((await act(s,user,{action:'recover',code:confirmed.recoveryCodes[1]},third,now+30000)).ok,false);assert.equal((await act(s,user,{action:'recover',code:rotated.recoveryCodes[0]},third,now+30000)).ok,true);
});
test('ordinary snapshots and staff status never disclose encrypted secrets, pending setup or recovery hashes',async()=>{
 const {s,ctx}=await enrolled(),data=JSON.stringify(view(s,user,ctx,now));for(const key of ['ciphertext','recoveryHashes','setupId','encryptionKey'])assert.ok(!data.includes(key));
 const state=seed(now);Object.assign(state,s);assert.equal(snapshot(state,state.profiles['demo-buyer'],'buyer',now).staffSecurity,undefined);
 for(const e of s.staffSecurityAudit)assert.deepEqual(Object.keys(e).sort(),['actorId','event','id','result','time']);
});
