import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,apply,processTimers,snapshot} from '../lib/maxiflora/engine.mjs';
import {businessAction} from '../lib/maxiflora/business.mjs';
import {inventoryVersion} from '../lib/maxiflora/inventory.mjs';
import {publicationDays,renewStockPublication,expireStockPublications} from '../lib/maxiflora/offer-publication.mjs';
import {previewOffers,applyOffers} from '../lib/maxiflora/offers-import.mjs';
import {offersWorkbook,parseOfferRecords,headers} from '../lib/maxiflora/offers-workbook.mjs';
import {unzipSync,strFromU8} from 'fflate';
const now=Date.parse('2026-10-21T05:00:00Z'),DAY=86400000;
const setup=()=>{const s=seed(now);return {s,u:s.profiles['demo-supplier'],buyer:s.profiles['demo-buyer'],p:s.products[0]}};
const item={pid:1,qty:25,pack:25,price:7000};
const renew=async(s,u,p,days,time=now)=>businessAction(s,u,{action:'offer-renew',id:p.id,publicationDays:days,confirmFresh:true,version:await inventoryVersion(p)},time);
test('stock draft defaults to seven days and starts countdown only on confirmed publication',async()=>{
 const {s,u}=setup();const result=apply(s,u,{action:'offer',product:{baseId:'flora-1',name:'Rose',pack:25,price:5000,total:100}},now),p=s.products.find(p=>p.id===result.id);
 assert.equal(p.publicationDays,7);assert.equal(p.publicationUntil,undefined);assert.equal(p.published,false);
 await renew(s,u,p,7,now+2*DAY);assert.equal(p.publicationUntil,now+9*DAY);assert.equal(p.published,true);
});
test('only exact 3, 5 or 7 days are accepted; no client can choose a longer publication',async()=>{
 for(const days of [3,5,7]){const {s,u,p}=setup();await renew(s,u,p,days);assert.equal(p.publicationUntil,now+days*DAY);}
 for(const days of [null,0,1,4,8,30,'7',NaN]){assert.throws(()=>publicationDays(days));const {s,u,p}=setup(),before=structuredClone(p);await assert.rejects(()=>renew(s,u,p,days));assert.deepEqual(p,before);}
});
test('expiry excludes stock from catalog and stale checkout at the exact deadline even before a timer runs',async()=>{
 const {s,u,buyer,p}=setup();await renew(s,u,p,3);const until=p.publicationUntil;
 assert.ok(snapshot(s,null,'buyer',until-1).products.some(x=>x.id===p.id));assert.ok(!snapshot(s,null,'buyer',until).products.some(x=>x.id===p.id));
 const result=apply(s,buyer,{action:'checkout',items:[item]},until);assert.match(result.results[0].error,/истёк/);assert.equal(p.reserved,0);
 processTimers(s,until);assert.equal(p.published,false);assert.equal(p.publicationExpiredAt,until);
});
test('expiry preserves physical inventory, reserves and existing order terms and permits fulfillment',async()=>{
 const {s,u,buyer,p}=setup();await renew(s,u,p,3);apply(s,buyer,{action:'checkout',items:[item]},p.publicationUntil-1000);const o=s.orders[0];
 apply(s,u,{action:'ready',id:o.id,version:o.version},p.publicationUntil-500);
 const before={total:p.total,reserved:p.reserved,items:structuredClone(o.items),pickupBy:o.pickupBy};processTimers(s,p.publicationUntil);
 assert.equal(p.total,before.total);assert.equal(p.reserved,before.reserved);assert.deepEqual(o.items,before.items);assert.equal(o.pickupBy,before.pickupBy);assert.equal(o.status,'ready');
 apply(s,u,{action:'issue',id:o.id,version:o.version},p.publicationUntil+100);assert.equal(o.status,'done');assert.equal(p.total,before.total-25);
});
test('price edits, receipts, counts and reservations never restart a publication period',async()=>{
 const {s,u,p}=setup();await renew(s,u,p,5);const until=p.publicationUntil;
 await businessAction(s,u,{action:'offer-update',id:1,version:await inventoryVersion(p),name:p.name,price:9000,pack:25},now+DAY);
 apply(s,u,{action:'receive',id:1,qty:25},now+DAY);apply(s,u,{action:'count',id:1,qty:p.total,reason:'Test'},now+DAY);assert.equal(p.publicationUntil,until);
});
test('renewal requires own offer, approved active supplier, confirmation and exact stock version',async()=>{
 const {s,u,p,buyer}=setup(),version=await inventoryVersion(p),b={action:'offer-renew',id:1,version,publicationDays:3,confirmFresh:true};
 await assert.rejects(()=>businessAction(s,buyer,b,now),e=>e.status===403);
 await assert.rejects(()=>businessAction(s,{...u,approved:false},b,now),e=>e.status===403);
 await assert.rejects(()=>businessAction(s,{...u,planUntil:now},b,now),e=>e.status===403);
 await assert.rejects(()=>businessAction(s,u,{...b,confirmFresh:false},now));
 apply(s,u,{action:'receive',id:1,qty:25},now);await assert.rejects(()=>businessAction(s,u,b,now),e=>e.status===409);
});
test('renewal counts currently active tariff slots and cannot resurrect transit as a stock offer',async()=>{
 const {s,u,p}=setup();s.products=Array.from({length:6},(_,i)=>({...p,id:i+1,publicationHistory:[]}));u.plan='Start';
 await assert.rejects(()=>renew(s,u,s.products[0],7),/лимит/);s.products[1].publicationUntil=now;await renew(s,u,s.products[0],7);
 const transit={...p,id:100,transit:true};s.products.push(transit);await assert.rejects(()=>renew(s,u,transit,7),/наличии/);
});
test('expiry delivers one supplier-only notification per cycle; renewal allows a new expiry event',async()=>{
 const {s,u,p}=setup();s.products=[p];await renew(s,u,p,3);expireStockPublications(s,p.publicationUntil);expireStockPublications(s,p.publicationUntil+1);assert.equal(s.notifications.length,1);assert.deepEqual(s.notifications[0].users,[u.id]);assert.equal(s.notifications[0].target,'offers');
 await renew(s,u,p,5,now+3*DAY);expireStockPublications(s,now+8*DAY);assert.equal(s.notifications.length,2);
});
test('legacy listings use known creation time once, unknown dates require review and never receive an invented fresh week',()=>{
 const {s,p}=setup();for(const key of ['publicationDays','publicationStartedAt','publicationUntil','publicationRevision','publicationHistory'])delete p[key];p.createdAt=now-8*DAY;s.products=[p];expireStockPublications(s,now);assert.equal(p.published,false);assert.equal(p.publicationUntil,now-DAY);
 const q={...p,id:99,published:true};delete q.publicationUntil;delete q.publicationStartedAt;delete q.createdAt;s.products.push(q);expireStockPublications(s,now);assert.equal(q.published,false);assert.equal(q.publicationNeedsReview,true);assert.equal(q.total,p.total);
});
test('preorders do not expire by stock age; received linked stock starts its own period without repeated extensions',()=>{
 const {s,u}=setup(),p=s.products.find(p=>p.transit);p.publicationDays=3;expireStockPublications(s,now+10*DAY);assert.equal(p.published,true);
 apply(s,u,{action:'receive',id:p.id,qty:25},now+10*DAY);const stock=s.products.find(x=>x.id===p.stockPartId);assert.equal(stock.publicationUntil,now+13*DAY);
 apply(s,u,{action:'receive',id:p.id,qty:25},now+11*DAY);assert.equal(stock.publicationUntil,now+13*DAY);assert.equal(stock.total,50);
});
test('import preserves active deadlines and explicitly confirms a new stock publication',async()=>{
 const {s,u,p}=setup(),make=async rows=>(await previewOffers(s,u,{rows,operationNo:crypto.randomUUID(),fileHash:crypto.randomUUID().replaceAll('-','').repeat(2)},now)).import;
 const row={id:1,baseId:p.baseId,pack:p.pack,price:8000,total:p.total,transit:false,published:true,arrival:'',publicationDays:7};
 let r=await make([row]);await applyOffers(s,u,{id:r.id,version:r.version,confirmCurrent:true},now+1);assert.equal(s.products[0].publicationUntil,p.publicationUntil);
 r=await make([{...row,id:null,publicationDays:3}]);await assert.rejects(()=>applyOffers(s,u,{id:r.id,version:r.version,confirmCurrent:true},now+1),/свежесть/);
 const done=await applyOffers(s,u,{id:r.id,version:r.version,confirmCurrent:true,confirmFresh:true},now+1);const newOffer=s.products.find(x=>x.id===done.import.result[0].id);assert.equal(newOffer.publicationUntil,now+1+3*DAY);
});
test('an offer import reviewed before expiry cannot silently republish after its deadline',async()=>{
 const {s,u,p}=setup();await renew(s,u,p,3);const row={id:1,baseId:p.baseId,pack:p.pack,price:p.price,total:p.total,transit:false,published:true,arrival:'',publicationDays:3};
 const r=(await previewOffers(s,u,{rows:[row],operationNo:crypto.randomUUID(),fileHash:'a'.repeat(64)},now)).import;
 await assert.rejects(()=>applyOffers(s,u,{id:r.id,version:r.version,confirmCurrent:true},p.publicationUntil),e=>e.status===409);assert.equal(s.offerImports[0].status,'draft');
});
test('new and legacy XLSX records preserve duration; invalid cells do not become the default',()=>{
 const template={rows:[{id:1,baseId:'flora-1',name:'Rose',pack:25,price:5000,total:100,transit:false,published:true,publicationDays:5}],operationNo:crypto.randomUUID(),author:'test'};
 const xml=strFromU8(unzipSync(offersWorkbook(template))['xl/worksheets/sheet1.xml']);assert.match(xml,/<c r="M2"><v>5<\/v>/);
 const head=Object.fromEntries(headers.map((h,i)=>['ABCDEFGHIJKLMN'[i],h])),row={A:'1',B:'flora-1',C:'Rose',D:'25',E:'5000',F:'100',G:'Нет',H:'',I:'Да',J:'',K:template.operationNo,L:template.author,M:'5',_row:2};
 assert.equal(parseOfferRecords([head,row],'f'.repeat(64)).rows[0].publicationDays,5);
 const legacyHead={...head},legacyRow={...row};delete legacyHead.M;delete legacyRow.M;assert.equal(parseOfferRecords([legacyHead,legacyRow],'f'.repeat(64)).rows[0].publicationDays,undefined);
 assert.equal(parseOfferRecords([head,{...row,M:'invalid'}],'f'.repeat(64)).rows[0].publicationDays,null);
});
