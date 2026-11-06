import test from 'node:test';
import assert from 'node:assert/strict';
import {makeChallenge,storeChallenge,markDelivered,consumeCode,normalizePhone,markDeliveryFailed} from '../lib/maxiflora/auth-codes.mjs';
const now=1800000000000,secret='private-test-key-'.repeat(4),browser='a'.repeat(64),phone='+77000000000';
const challenge=()=>makeChallenge({phone,purpose:'register',browser,secret},now);
test('Kazakhstan phone normalization and validation',()=>{
 assert.equal(normalizePhone('8 (700) 000-00-00'),phone);assert.equal(normalizePhone('+7 700 000 00 00'),phone);assert.throws(()=>normalizePhone('+79990000000'));
});
test('code is hashed, cannot verify before delivery, and is consumed once',async()=>{
 const {record,code}=await challenge(),s={};assert.equal(record.code,undefined);assert.notEqual(record.digest,code);storeChallenge(s,record,now);
 const input={id:record.id,phone,purpose:'register',browser,code,secret};
 assert.equal((await consumeCode(s,input,now)).ok,false);assert.equal(markDelivered(s,record.id,now),true);
 assert.equal((await consumeCode(s,input,now)).ok,true);assert.equal((await consumeCode(s,input,now)).ok,false);
});
test('wrong browser and purpose never prove contact; five wrong attempts lock code',async()=>{
 const {record,code}=await challenge(),s={};storeChallenge(s,record,now);markDelivered(s,record.id,now);
 const input={id:record.id,phone,purpose:'register',browser,code,secret};
 assert.equal((await consumeCode(s,{...input,purpose:'reset-password'},now)).ok,false);
 assert.equal((await consumeCode(s,{...input,browser:'b'.repeat(64)},now)).ok,false);
 for(let i=0;i<5;i++)assert.equal((await consumeCode(s,{...input,code:code==='000000'?'111111':'000000'},now)).ok,false);
 assert.equal((await consumeCode(s,input,now)).ok,false);
});
test('expiry, delivery failure, cooldown and resend invalidate old code',async()=>{
 const {record,code}=await challenge(),s={};storeChallenge(s,record,now);markDeliveryFailed(s,record.id);assert.equal(markDelivered(s,record.id,now),false);
 assert.throws(()=>storeChallenge(s,{...record,id:'another'},now+1000));
 const second=await makeChallenge({phone,purpose:'register',browser,secret},now+61000);storeChallenge(s,second.record,now+61000);markDelivered(s,second.record.id,now+61000);
 assert.equal((await consumeCode(s,{id:record.id,phone,purpose:'register',browser,code,secret},now+61000)).ok,false);
 assert.equal((await consumeCode(s,{id:second.record.id,phone,purpose:'register',browser,code:second.code,secret},second.record.expiresAt)).ok,false);
});
test('hourly limit persists when expired challenges have been pruned',async()=>{
 const s={};for(let i=0;i<5;i++){const {record}=await makeChallenge({phone,purpose:'login',browser,secret},now+i*360000);storeChallenge(s,record,now+i*360000)}
 const next=await makeChallenge({phone,purpose:'login',browser,secret},now+2000000);assert.throws(()=>storeChallenge(s,next.record,now+2000000));
});
test('code proof is bound to its channel; WhatsApp resends share Telegram cooldown and supersede the old code',async()=>{
 const first=await challenge(),s={};storeChallenge(s,first.record,now);markDelivered(s,first.record.id,now);
 const second=await makeChallenge({phone,purpose:'register',browser,secret,channel:'whatsapp'},now+61000);
 assert.throws(()=>storeChallenge(s,second.record,now+1000));storeChallenge(s,second.record,now+61000);markDelivered(s,second.record.id,now+61000);
 const input={id:second.record.id,phone,purpose:'register',browser,code:second.code,secret};
 assert.equal((await consumeCode(s,input,now+61000)).ok,false);assert.equal(s.authChallenges[1].attempts,0);
 const proof=await consumeCode(s,{...input,channel:'whatsapp'},now+61000);assert.equal(proof.ok,true);assert.equal(proof.channel,'whatsapp');
 assert.equal((await consumeCode(s,{...input,id:first.record.id,code:first.code},now+61000)).ok,false);
});
test('legacy Telegram records without a channel remain valid',async()=>{
 const {record,code}=await challenge(),s={};delete record.channel;storeChallenge(s,record,now);markDelivered(s,record.id,now);
 assert.equal((await consumeCode(s,{id:record.id,phone,purpose:'register',browser,code,secret},now)).channel,'telegram');
});
