import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,apply,snapshot} from '../lib/maxiflora/engine.mjs';
import {activeOfferLimit,launchPolicy} from '../lib/maxiflora/launch-policy.mjs';
import {upgradeLaunchTrial,enrollNewAccount} from '../lib/maxiflora/subscriptions.mjs';
import {businessAction} from '../lib/maxiflora/business.mjs';
import {inventoryVersion} from '../lib/maxiflora/inventory.mjs';
import {minimumOrder} from '../lib/maxiflora/order-minimum.mjs';
import {offersWorkbook,parseOfferRecords,headers} from '../lib/maxiflora/offers-workbook.mjs';
const now=Date.parse('2026-10-31T05:00:00Z');
function setup(){const s=seed(now),u=s.profiles['demo-supplier'];s.products=[];return {s,u,buyer:s.profiles['demo-buyer']}}
const offer=(s,u,minimum=100)=>apply(s,u,{action:'offer',product:{baseId:'flora-1',name:'Rose',pack:20,minOrderQty:minimum,price:4000,total:200}},now).id;
test('active limits are 5 / 12 / unlimited and withdrawn slots can be replaced immediately',()=>{
 assert.deepEqual(['Start','Business','MAX'].map(activeOfferLimit),[5,12,Infinity]);
 for(const plan of ['Start','Business']){const {s,u}=setup();u.plan=plan;
 const ids=Array.from({length:activeOfferLimit(plan)+1},()=>offer(s,u));
 for(const id of ids.slice(0,-1))apply(s,u,{action:'publish',id,confirmFresh:true},now);
 assert.throws(()=>apply(s,u,{action:'publish',id:ids.at(-1),confirmFresh:true},now),/лимит/);
 apply(s,u,{action:'publish',id:ids[0]},now);
 apply(s,u,{action:'publish',id:ids.at(-1),confirmFresh:true},now);
 assert.equal(s.products.filter(p=>p.published).length,activeOfferLimit(plan));
 }
});
test('MAX intro grant and old active trial upgrade do not renew expiry or override paid access',()=>{
 const u={};enrollNewAccount(u,now);assert.equal(u.plan,'MAX');
 const end=now+1000,legacy={plan:'Start',planUntil:end,launchTrial:{campaignId:launchPolicy.id,plan:'Start',endsAt:end}};
 assert.equal(upgradeLaunchTrial(legacy,now),true);assert.equal(legacy.plan,'MAX');assert.equal(legacy.planUntil,end);assert.equal(upgradeLaunchTrial(legacy,now),false);
 const paid={plan:'Business',planUntil:end+999,launchTrial:{campaignId:launchPolicy.id,plan:'Start',endsAt:end}};upgradeLaunchTrial(paid,now);assert.equal(paid.plan,'Business');assert.equal(paid.planUntil,end+999);
});
test('MOQ validates full packs, enforces checkout and snapshots accepted terms',async()=>{
 const {s,u,buyer}=setup();assert.throws(()=>offer(s,u,99),/Минимальный/);const id=offer(s,u);const p=s.products.find(p=>p.id===id);apply(s,u,{action:'publish',id,confirmFresh:true},now);
 assert.equal(snapshot(s,buyer,'buyer',now).products[0].minOrderQty,100);
 let result=apply(s,buyer,{action:'checkout',items:[{pid:id,qty:20,pack:20,price:4000}]},now);assert.match(result.results[0].error,/100/);assert.equal(p.reserved,0);
 result=apply(s,buyer,{action:'checkout',items:[{pid:id,qty:100,pack:20,price:4000}]},now);assert.ok(result.results[0].orderId);assert.equal(s.orders[0].items[0].minOrderQty,100);
 await businessAction(s,u,{action:'offer-update',id,version:await inventoryVersion(p),name:p.name,pack:20,price:4000,minOrderQty:120},now);
 assert.equal(p.minOrderQty,120);assert.equal(s.orders[0].items[0].minOrderQty,100);assert.equal(s.orders[0].items[0].qty,100);
 result=apply(s,buyer,{action:'checkout',items:[{pid:id,qty:100,pack:20,price:4000}]},now);assert.match(result.results[0].error,/120/);
});
test('legacy offers default to a pack, XLSX supports an optional minimum column',()=>{
 assert.equal(minimumOrder({pack:20}),20);
 const head=Object.fromEntries(headers.map((h,i)=>['ABCDEFGHIJKLMN'[i],h]));const row={A:'',B:'flora-1',C:'Rose',D:'20',E:'4000',F:'200',G:'Нет',H:'',I:'Нет',J:'',K:'op',L:'test',M:'7',N:'100',_row:2};
 assert.equal(parseOfferRecords([head,row],'a'.repeat(64)).rows[0].minOrderQty,100);
 delete head.N;delete row.N;assert.equal(parseOfferRecords([head,row],'a'.repeat(64)).rows[0].minOrderQty,undefined);
});
