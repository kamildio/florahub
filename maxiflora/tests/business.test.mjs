import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,apply,demoProfiles,processTimers} from '../lib/maxiflora/engine.mjs';
import {businessAction,businessView,publicSuppliers,supplierRating,reports} from '../lib/maxiflora/business.mjs';
import {inventoryVersion,inventoryReport} from '../lib/maxiflora/inventory.mjs';
const now=Date.parse('2026-10-20T05:00:00Z'),u=demoProfiles.supplier,buyer=demoProfiles.buyer;
function order(s,pid=1,qty=50,time=now){const p=s.products.find(x=>x.id===pid);const r=apply(s,buyer,{action:'checkout',items:[{pid,qty,price:p.price,pack:p.pack}]},time);return s.orders.find(o=>o.id===r.results[0].orderId);}
function action(s,o,kind,time=now+1000,extra={},actor=u){return apply(s,actor,{action:kind,id:o.id,version:o.version,...extra},time);}
function finish(s){const o=order(s);action(s,o,'ready');action(s,o,'issue',now+2000);return o;}
test('date and address changes require explicit acceptance and retain the original chain deadline',()=>{
 const s=seed(now),o=order(s,9);action(s,o,'propose',now+1000,{items:o.items,arrival:'2026-10-25',address:'Шымкент, другой склад'});const deadline=o.proposal.deadline;assert.equal(o.arrival,'2026-10-23');assert.equal(o.address,u.address);
 action(s,o,'propose',now+2000,{items:o.items.map(x=>({...x,qty:25}))},buyer);assert.equal(o.proposal.arrival,'2026-10-25');assert.equal(o.proposal.deadline,deadline);action(s,o,'agree',now+3000);assert.equal(o.arrival,'2026-10-25');assert.equal(o.address,'Шымкент, другой склад');assert.equal(o.status,'new');assert.equal(o.termsHistory.length,1);
});
test('only a supplier proposes new dates, malformed dates and unready pickup deadlines are rejected',()=>{
 const s=seed(now),o=order(s,9);assert.throws(()=>action(s,o,'propose',now+1,{items:o.items,arrival:'2026-10-25'},buyer),/поставщик/);assert.throws(()=>action(s,o,'propose',now+1,{items:o.items,arrival:'2027-02-31'}),/дату/);assert.throws(()=>action(s,o,'propose',now+1,{items:o.items,pickupBy:now+100000}),/готового/);
});
test('explicit pickup extension changes a ready order only on consent; no implicit new 24 hours',()=>{
 const s=seed(now),o=order(s);action(s,o,'ready');const before=o.pickupBy;action(s,o,'propose',now+2000,{items:o.items,assembled:true,pickupBy:before+3600000});assert.equal(o.pickupBy,before);action(s,o,'agree',now+3000,{},buyer);assert.equal(o.pickupBy,before+3600000);assert.equal(o.termsHistory[0].before.pickupBy,before);
});
test('zero removes an item, an entirely empty composition requires cancellation',()=>{
 const s=seed(now),p=s.products[0],q=s.products[1];apply(s,buyer,{action:'checkout',items:[{pid:p.id,qty:25,price:p.price,pack:p.pack},{pid:q.id,qty:25,price:q.price,pack:q.pack}]},now);const o=s.orders[0];action(s,o,'propose',now+1,{items:o.items.map((x,i)=>({...x,qty:i?25:0})),assembled:true});action(s,o,'agree',now+2,{},buyer);assert.equal(o.items.length,1);assert.equal(p.reserved,0);assert.throws(()=>action(s,o,'propose',now+3,{items:o.items.map(x=>({...x,qty:0})),assembled:true}),/Пустой/);
});
test('shortage preserves reserves, blocks new sales and never creates missing goods on cancellation',async()=>{
 const s=seed(now),a=order(s,1,50),b=order(s,1,50,now+1),p=s.products[0];await businessAction(s,u,{action:'shortage',id:p.id,version:await inventoryVersion(p),factual:50,reason:'Проверенная порча'},now+2);assert.equal(p.total,50);assert.equal(p.reserved,100);assert.ok(p.holdSales);assert.equal(a.items[0].allocated,50);assert.equal(b.items[0].allocated,0);assert.throws(()=>action(s,b,'ready',now+3),/не полностью/);assert.throws(()=>action(s,b,'propose',now+3,{items:b.items,assembled:true}),/не обеспечен/);
 assert.ok(apply(s,buyer,{action:'checkout',items:[{pid:1,qty:25,price:p.price,pack:p.pack}]},now+4).results[0].error);action(s,b,'cancel',now+5,{reason:'Нехватка'});assert.equal(p.total,50);assert.equal(p.reserved,50);assert.equal(p.holdSales,undefined);const report=inventoryReport(s,u,'2026-10',now+6).rows[0];assert.equal(report.adjustments,-980);assert.equal(report.closing,50);
});
test('shortage rechecks versions and ownership, receipts resolve a physical deficit without canceling orders',async()=>{
 const s=seed(now),o=order(s,1,100),p=s.products[0],v=await inventoryVersion(p);apply(s,u,{action:'receive',id:1,qty:25},now+1);await assert.rejects(()=>businessAction(s,u,{action:'shortage',id:1,version:v,factual:25,reason:'Тест'},now+2),/изменились/);await assert.rejects(()=>businessAction(s,buyer,{action:'shortage',id:1,factual:25},now+2),/недоступно/);await businessAction(s,u,{action:'shortage',id:1,version:await inventoryVersion(p),factual:25,reason:'Пересчёт'},now+3);apply(s,u,{action:'receive',id:1,qty:75},now+4);assert.equal(p.holdSales,undefined);assert.equal(o.items[0].allocated,100);assert.equal(o.status,'new');
});
test('full transit receipt becomes stock while old preorder identity and pack stay intact',()=>{
 const s=seed(now),o=order(s,9,100),p=s.products[8];apply(s,u,{action:'receive',id:9,qty:500},now+1);assert.equal(p.transit,false);assert.equal(p.batchSourceId,9);assert.equal(p.total,100);assert.equal(s.products.find(x=>x.id===p.stockPartId).total,400);assert.equal(o.transit,true);assert.equal(o.status,'new');assert.equal(o.items[0].allocated,100);action(s,o,'accept',now+2);action(s,o,'ready',now+3);action(s,o,'issue',now+4);assert.equal(p.total,0);assert.equal(inventoryReport(s,u,'2026-10',now+5).rows.filter(r=>[9,p.stockPartId].includes(r.id)).reduce((n,r)=>n+r.closing,0),400);
});
test('closing an incomplete shipment records actual stock once and exposes unresolved deficits',async()=>{
 const s=seed(now),o=order(s,9,100),p=s.products[8];apply(s,u,{action:'receive',id:9,qty:50},now+1);const r=await businessAction(s,u,{action:'batch-close',id:9,version:await inventoryVersion(p),reason:'Остаток не приедет'},now+2);assert.equal(p.total,50);assert.equal(p.transit,false);assert.equal(r.deficit,50);assert.equal(p.reserved,100);assert.equal(s.movements.length,1);assert.equal(o.status,'new');
});
test('offer edits preserve order prices and reject stale or reserved pack changes',async()=>{
 const s=seed(now),o=order(s),p=s.products[0],version=await inventoryVersion(p);await assert.rejects(()=>businessAction(s,u,{action:'offer-update',id:1,version,name:p.name,price:9000,pack:20},now+1),/резервы/);await businessAction(s,u,{action:'offer-update',id:1,version,name:p.name,price:9000,pack:25},now+1);assert.equal(o.items[0].price,7000);assert.equal(p.price,9000);await assert.rejects(()=>businessAction(s,u,{action:'offer-update',id:1,version,name:p.name,price:8000,pack:25},now+2),/изменилось/);
});
test('reviews require completed own order, explicit stars/confirmation and publish once for 30 days',async()=>{
 const s=seed(now),o=order(s);await assert.rejects(()=>businessAction(s,buyer,{action:'review',id:o.id,stars:5,text:'',confirmed:true},now+1),/исполнения/);action(s,o,'ready');action(s,o,'issue',now+2);await assert.rejects(()=>businessAction(s,buyer,{action:'review',id:o.id,stars:0,text:'',confirmed:true},now+3),/звёзд/);await businessAction(s,buyer,{action:'review',id:o.id,stars:2,text:'',confirmed:true},now+3);await assert.rejects(()=>businessAction(s,buyer,{action:'review',id:o.id,stars:5,text:'Меняю',confirmed:true},now+4),/уже опубликован/);const p=publicSuppliers(s)[0];assert.equal(p.reviews[0].stars,2);assert.ok(!('buyerId' in p.reviews[0]));assert.ok(!('orderId' in p.reviews[0]));const s2=seed(now),other=finish(s2);await assert.rejects(()=>businessAction(s2,buyer,{action:'review',id:other.id,stars:5,text:'',confirmed:true},other.completedAt+30*86400000),/30 дней/);
});
test('rating uses 70/30 weighting and half-up rounding; missing data stays absent',async()=>{
 const s=seed(now);assert.equal(supplierRating(s,u.id).rating,null);for(let i=0;i<10;i++){const o=order(s,8,1,now+i);if(i<8){action(s,o,'ready',now+100);action(s,o,'issue',now+200);}else action(s,o,'cancel',now+200,{reason:'Отказ'});if(i<2)await businessAction(s,buyer,{action:'review',id:o.id,stars:i?5:4,text:'',confirmed:true},now+300);}
 assert.equal(supplierRating(s,u.id).rating,4.4);assert.equal(supplierRating(s,u.id).onTime,8);assert.equal(supplierRating(s,u.id).counted,10);s.orders[0].discipline={neutral:true};assert.equal(supplierRating(s,u.id).counted,9);
});
test('reports use creation date for outcomes and actual issue date for issued value from snapshots',()=>{
 const start=Date.parse('2026-09-30T18:55:00Z'),s=seed(start),o=order(s,1,50,start);action(s,o,'ready',start+1000);action(s,o,'issue',start+600000);s.products[0].price=99999;const r=reports(s,u,'2026-10-01','2026-10-31',now);assert.equal(r.created,0);assert.equal(r.issued,1);assert.equal(r.issuedValue,14000);assert.equal(r.companies[0].created,0);assert.equal(r.companies[0].value,14000);assert.equal(r.goods[0].qty,50);assert.throws(()=>reports(s,buyer,'2026-10-01','2026-10-31',now),/поставщика/);
});
test('both parties join one support case, private evidence never leaks to the counterparty',async()=>{
 const s=seed(now),o=order(s);const a=await businessAction(s,buyer,{action:'case-open',orderId:o.id,text:'Вопрос покупателя',visibility:'private'},now+1),b=await businessAction(s,u,{action:'case-open',orderId:o.id,text:'Ответ поставщика',visibility:'shared'},now+2);assert.equal(a.id,b.id);assert.equal(s.supportCases.length,1);assert.equal(businessView(s,u).cases[0].messages.length,1);assert.equal(businessView(s,buyer).cases[0].messages.length,2);assert.equal(businessView(s,null).cases.length,0);assert.equal(o.status,'new');assert.equal(s.products[0].reserved,50);await assert.rejects(()=>businessAction(s,{id:'stranger'},{action:'case-message',id:a.id,text:'Чужое',visibility:'shared'},now+3),/недоступно/);
});
test('partial receipt exposes only genuinely free physical units as a linked stock offer without doubling balances',()=>{
 const s=seed(now),o=order(s,9,100),p=s.products[8];apply(s,u,{action:'receive',id:9,qty:300},now+1);
 const stock=s.products.find(x=>x.id===p.stockPartId);assert.equal(p.received,100);assert.equal(p.total,300);assert.equal(p.total-p.received,200);assert.equal(stock.total,200);assert.equal(stock.transit,false);assert.equal(stock.physicalPartOf,9);assert.equal(stock.pack,25);assert.equal(o.items[0].allocated,100);
 const report=inventoryReport(s,u,'2026-10',now+2);assert.equal(report.rows.filter(r=>[9,stock.id].includes(r.id)).reduce((n,r)=>n+r.received,0),300);assert.equal(report.rows.filter(r=>[9,stock.id].includes(r.id)).reduce((n,r)=>n+r.closing,0),300);assert.equal(s.movements.filter(m=>m.kind==='transfer-in').length,1);assert.equal(s.movements.filter(m=>m.kind==='transfer-out').length,1);
 action(s,o,'cancel',now+3,{reason:'Отмена'});assert.equal(stock.total,300);assert.equal(p.received,0);assert.equal(p.total,200);assert.equal(s.products.filter(x=>x.physicalPartOf===9).length,1);
});
test('warehouse address update affects future offers while preserving existing order pickup snapshots',()=>{
 const s=seed(now),o=order(s);apply(s,u,{action:'profile',address:'Шымкент · новый склад'},now+1);assert.equal(s.products[0].address,'Шымкент · новый склад');assert.equal(o.address,u.address);assert.equal(s.profiles[u.id].approved,true);
});
test('oversized monetary values are rejected before a reserve or an imprecise order total is created',()=>{
 const s=seed(now),p=s.products[0],q=s.products[1];for(const x of [p,q])Object.assign(x,{pack:1,price:1000000000,total:1000000000});
 const bad=apply(s,buyer,{action:'checkout',items:[{pid:1,qty:1000000000,price:p.price,pack:1}]},now);assert.match(bad.results[0].error,/Сумма/);assert.equal(p.reserved,0);assert.equal(s.orders.length,0);
 const partial=apply(s,buyer,{action:'checkout',items:[{pid:1,qty:8000000,price:p.price,pack:1},{pid:2,qty:8000000,price:q.price,pack:1}]},now+1);assert.ok(partial.results.some(r=>r.pid===2&&r.error));assert.equal(q.reserved,0);assert.equal(s.orders[0].items.length,1);assert.ok(Number.isSafeInteger(s.orders[0].items[0].qty*s.orders[0].items[0].price));
});
