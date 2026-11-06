import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,apply,demoProfiles} from '../lib/maxiflora/engine.mjs';
import {inventoryVersion,ensureInventory} from '../lib/maxiflora/inventory.mjs';
import {previewOffers,applyOffers,offerTemplate} from '../lib/maxiflora/offers-import.mjs';
const now=Date.parse('2026-10-20T05:00:00Z'),u=demoProfiles.supplier;
const source=p=>({id:p.id,baseId:p.baseId,pack:p.pack,price:p.price,total:p.total,transit:p.transit,arrival:p.transit?p.arrival:'',published:p.published});
async function draft(s,rows,extra={}){return (await previewOffers(s,u,{rows,operationNo:crypto.randomUUID(),fileHash:crypto.randomUUID().replaceAll('-','').repeat(2),...extra},now)).import;}
test('catalog links independent stock and future offers to one permanent base product',()=>{
 const s=seed(now);const base=s.baseProducts[0];const a=apply(s,u,{action:'offer',product:{baseId:base.id,name:'Ignored custom name',pack:20,price:1200,total:200}},now),b=apply(s,u,{action:'offer',product:{baseId:base.id,name:'Ignored',pack:25,price:1400,total:500,transit:true,arrival:'2026-10-25'}},now);const pa=s.products.find(p=>p.id===a.id),pb=s.products.find(p=>p.id===b.id);assert.equal(pa.name,base.name);assert.equal(pa.baseId,pb.baseId);assert.equal(pa.pack,20);assert.equal(pb.pack,25);assert.throws(()=>apply(s,u,{action:'offer',product:{baseId:'invented',name:'test',pack:1,price:1,total:0}},now),/справочника/);
});
test('legacy directory migration preserves offer identity and groups equal base products',()=>{
 const s=seed(now);delete s.baseProducts;for(const p of s.products)delete p.baseId;s.products.push({...s.products[0],id:900,pack:20});ensureInventory(s,now);assert.equal(s.products[0].baseId,s.products.at(-1).baseId);assert.equal(s.baseProducts.length,9);assert.equal(s.products.at(-1).id,900);
});
test('default offer import updates prices while retaining current warehouse quantities',async()=>{
 const s=seed(now),p=s.products[0];const r=await draft(s,[{...source(p),price:9000,total:3,version:await inventoryVersion(p)}]);assert.equal(r.preview[0].afterTotal,1030);assert.equal(p.price,7000);await applyOffers(s,u,{id:r.id,version:r.version,confirmCurrent:true},now+1);assert.equal(s.products[0].price,9000);assert.equal(s.products[0].total,1030);assert.equal(s.movements.length,0);
});
test('count mode records actual adjustment, rejects quantities below reserves and retains order snapshots',async()=>{
 const s=seed(now),p=s.products[0];apply(s,demoProfiles.buyer,{action:'checkout',items:[{pid:1,qty:50,price:7000,pack:25}]},now);let r=await draft(s,[{...source(p),price:8000,total:25}],{mode:'count'});assert.ok(r.preview[0].errors.some(e=>e.includes('резерва')));r=await draft(s,[{...source(p),price:8000,total:100}],{mode:'count'});await applyOffers(s,u,{id:r.id,version:r.version,confirmCurrent:true},now+1);assert.equal(s.products[0].total,100);assert.equal(s.products[0].reserved,50);assert.equal(s.orders[0].items[0].price,7000);assert.equal(s.movements[0].qty,-930);
});
test('new offer rows create once and map results to permanent IDs',async()=>{
 const s=seed(now),row={id:null,baseId:'flora-1',pack:20,price:1400,total:200,transit:false,arrival:'',published:false};const r=await draft(s,[row]);assert.equal(r.preview[0].errors.length,0);const done=await applyOffers(s,u,{id:r.id,version:r.version,confirmCurrent:true},now+1);assert.equal(s.products.length,10);assert.equal(s.products.at(-1).pack,20);assert.equal(done.import.result[0].id,s.products.at(-1).id);await applyOffers(s,u,{id:r.id,version:r.version,confirmCurrent:true},now+2);assert.equal(s.products.length,10);
});
test('duplicate and foreign IDs, invalid base products, formulas and non-integer units are visible as row errors',async()=>{
 const s=seed(now),p=s.products[0],r=await draft(s,[source(p),source(p),{...source(p),id:999},{...source(p),id:null,baseId:'unknown'},{...source(p),id:null,price:'=1+2'},{...source(p),id:null,pack:1.5}]);assert.equal(r.preview.filter(x=>x.errors.length).length,6);await assert.rejects(()=>applyOffers(s,u,{id:r.id,version:r.version,confirmCurrent:true,validOnly:true},now+1),/Нет корректных/);
});
test('plan is rechecked at apply and Business cannot create transit offers',async()=>{
 const s=seed(now),row={id:null,baseId:'flora-1',pack:25,price:1000,total:500,transit:true,arrival:'2026-10-25',published:false};const r=await draft(s,[row]);await assert.rejects(()=>applyOffers(s,{...u,plan:'Business'},{id:r.id,version:r.version,confirmCurrent:true},now+1),/MAX/);assert.equal(s.products.length,9);await assert.rejects(()=>offerTemplate(s,{...u,plan:'Start'},0,now),/Business/);
});
test('card limit is an atomic global error and valid-only does not bypass it',async()=>{
 const s=seed(now);s.products=s.products.filter(p=>!p.transit);const rows=Array.from({length:8},()=>({id:null,baseId:'flora-1',pack:25,price:1000,total:25,transit:false,arrival:'',published:true}));const business={...u,plan:'Business'};const r=(await previewOffers(s,business,{rows,operationNo:crypto.randomUUID(),fileHash:'f'.repeat(64)},now)).import;assert.match(r.globalError,/лимит/);await assert.rejects(()=>applyOffers(s,business,{id:r.id,version:r.version,confirmCurrent:true,validOnly:true},now+1),/лимит/);assert.equal(s.products.length,8);
});
test('a stale preview cannot overwrite concurrent warehouse or price changes',async()=>{
 const s=seed(now),p=s.products[0],r=await draft(s,[{...source(p),price:9000,version:await inventoryVersion(p)}]);apply(s,u,{action:'receive',id:1,qty:25},now+1);await assert.rejects(()=>applyOffers(s,u,{id:r.id,version:r.version,confirmCurrent:true},now+2),/изменились/);assert.equal(p.total,1055);assert.equal(p.price,7000);const refreshed=(await previewOffers(s,u,{id:r.id,version:r.version},now+3)).import;assert.equal(refreshed.preview[0].conflict,true);
});
test('atomic default and valid-only mode retain per-row results without deleting absent offers',async()=>{
 const s=seed(now),r=await draft(s,[{...source(s.products[0]),price:8000},{...source(s.products[1]),id:999}]);await assert.rejects(()=>applyOffers(s,u,{id:r.id,version:r.version,confirmCurrent:true},now+1),/ошибки/);assert.equal(s.products[0].price,7000);await applyOffers(s,u,{id:r.id,version:r.version,confirmCurrent:true,validOnly:true},now+2);assert.equal(s.products[0].price,8000);assert.equal(s.products.length,9);assert.equal(s.offerImports[0].skipped.length,1);
});
test('publication changes also invalidate a previously reviewed import',async()=>{
 const s=seed(now),p=s.products[0],r=await draft(s,[{...source(p),price:8000,version:await inventoryVersion(p)}]);apply(s,u,{action:'publish',id:1},now+1);await assert.rejects(()=>applyOffers(s,u,{id:r.id,version:r.version,confirmCurrent:true},now+2),/изменились/);assert.equal(p.published,false);assert.equal(p.price,7000);
});
