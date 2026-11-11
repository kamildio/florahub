import test from 'node:test';import assert from 'node:assert/strict';
import {privacyAction,marketingAllowed,claimDeletionNotice,finishDeletionNotice} from '../lib/maxiflora/privacy.mjs';
import {PRIVACY_VERSION} from '../lib/maxiflora/privacy-policy.mjs';
import {seed,apply,snapshot} from '../lib/maxiflora/engine.mjs';
const now=Date.parse('2026-11-03T12:00:00+05:00');
function state(){const s=seed(now),u=s.profiles['demo-buyer'];u.consent={privacy:PRIVACY_VERSION,accepted:true};return s;}
const checkout=(s,pid=1)=>{const p=s.products.find(p=>p.id===pid);return apply(s,s.profiles['demo-buyer'],{action:'checkout',items:[{pid,qty:p.pack,pack:p.pack,price:p.price}]},now).results[0].orderId};
test('marketing needs an explicit current choice and changes are audited independently of service consent',()=>{
 const s=state(),u=s.profiles['demo-buyer'];assert.equal(marketingAllowed(u),false);
 privacyAction(s,u,{action:'privacy-marketing',enabled:true},now);assert.equal(marketingAllowed(u),true);const consent=structuredClone(u.consent);
 privacyAction(s,u,{action:'privacy-marketing',enabled:false},now+1000);assert.equal(marketingAllowed(u),false);assert.deepEqual(u.consent,consent);assert.deepEqual(u.consentHistory.map(x=>x.enabled),[true,false]);assert.equal(u.consentHistory[1].account,u.id);
 privacyAction(s,u,{action:'privacy-marketing',enabled:false},now+2000);assert.equal(u.consentHistory.length,2);assert.throws(()=>privacyAction(s,u,{action:'privacy-marketing',enabled:'false'},now));
});
test('supplier receives only phone and email for its confirmed stock order; public, buyer, unrelated supplier and early snapshots do not',()=>{
 const s=state(),id=checkout(s),seller=s.profiles['demo-supplier'],buyer=s.profiles['demo-buyer'];
 assert.equal(snapshot(s,seller,'supplier',now).orders[0].buyerContact,undefined);
 apply(s,seller,{action:'ready',id,version:s.orders.find(o=>o.id===id).version},now+1);
 assert.deepEqual(snapshot(s,seller,'supplier',now+1).orders[0].buyerContact,{phone:buyer.phone,email:buyer.email});
 assert.equal(snapshot(s,buyer,'buyer',now+1).orders[0].buyerContact,undefined);assert.equal(snapshot(s,null,'buyer',now+1).orders.length,0);assert.equal(snapshot(s,{id:'unrelated',supplier:true},'supplier',now+1).orders.length,0);
 assert.equal(JSON.stringify(snapshot(s,seller,'supplier',now+1).orders).includes('buyer@example.test'),true);
});
test('preorder contacts release on acceptance and rejected/unconfirmed orders never release them',()=>{
 const s=state(),seller=s.profiles['demo-supplier'],id=checkout(s,9);assert.equal(snapshot(s,seller,'supplier',now).orders[0].buyerContact,undefined);apply(s,seller,{action:'accept',id,version:s.orders.find(o=>o.id===id).version},now+1);assert.ok(snapshot(s,seller,'supplier',now+1).orders[0].buyerContact);
 const other=state(),otherId=checkout(other);apply(other,other.profiles['demo-supplier'],{action:'cancel',id:otherId,version:other.orders.find(o=>o.id===otherId).version,reason:'нет в наличии'},now+1);assert.equal(snapshot(other,other.profiles['demo-supplier'],'supplier',now+1).orders[0].buyerContact,undefined);
});
test('confirmation alone does not release contacts without the buyer sharing consent',()=>{
 const s=state(),id=checkout(s);s.profiles['demo-buyer'].consent={privacy:'old'};apply(s,s.profiles['demo-supplier'],{action:'ready',id,version:s.orders.find(o=>o.id===id).version},now+1);assert.equal(snapshot(s,s.profiles['demo-supplier'],'supplier',now+1).orders[0].buyerContact,undefined);
});

test('deletion request creates one private case and email dispatch retries with an exclusive lease',()=>{
 const s=state(),u=s.profiles['demo-buyer'],request={action:'privacy-delete-request',operationId:crypto.randomUUID()};
 const result=privacyAction(s,u,request,now);
 assert.deepEqual(privacyAction(s,u,request,now+1),result);
 assert.deepEqual(privacyAction(s,u,{...request,operationId:crypto.randomUUID()},now+2),result);
 assert.equal(s.supportCases.length,1);
 assert.equal(s.supportCases[0].messages[0].visibility,'private');
 const job=claimDeletionNotice(s,now);assert.ok(job);assert.equal(claimDeletionNotice(s,now+1),null);
 finishDeletionNotice(s,job,false,now+2);assert.equal(claimDeletionNotice(s,now+3),null);
 const retry=claimDeletionNotice(s,now+300002);assert.ok(retry);
 finishDeletionNotice(s,job,true,now+300003);assert.notEqual(s.supportCases[0].emailNotice.status,'sent');
 finishDeletionNotice(s,retry,true,now+300004);assert.equal(claimDeletionNotice(s,now+600004),null);
 assert.ok(s.profiles[u.id]);assert.equal(s.supportCases.length,1);
});
