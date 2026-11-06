import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,apply,demoProfiles} from '../lib/maxiflora/engine.mjs';
import {ensureInventory,inventoryReport,supplierCalendar,receiptTemplate,previewReceipt,applyReceipt,ownImports} from '../lib/maxiflora/inventory.mjs';
import {makeWorkbook,boundedUnzip} from '../lib/maxiflora/workbook.mjs';
import {strFromU8,zipSync} from 'fflate';
const now=Date.parse('2026-10-20T05:00:00Z'),u=demoProfiles.supplier,buyer=demoProfiles.buyer;
function order(s,pid=1,qty=50){const p=s.products.find(x=>x.id===pid);apply(s,buyer,{action:'checkout',items:[{pid,qty,price:p.price,pack:p.pack}]},now);return s.orders[0];}
async function draft(s,quantities=[{id:1,qty:50}],extra={}){const template=await receiptTemplate(s,u,now);return (await previewReceipt(s,u,{operationNo:template.operationNo,fileHash:crypto.randomUUID().replaceAll('-','').repeat(2),rows:quantities.map(x=>({...x,version:template.rows.find(p=>p.id===x.id)?.version})),...extra},now+1)).import;}
test('monthly physical balance separates receipts, website issues, outside sales, adjustments and reserves',()=>{
 const s=seed(now),o=order(s);apply(s,u,{action:'receive',id:1,qty:100},now+1);apply(s,u,{action:'outside',id:1,qty:30,reason:'Прямая продажа'},now+2);apply(s,u,{action:'count',id:1,qty:1090,reason:'Инвентаризация'},now+3);
 apply(s,u,{action:'ready',id:o.id,version:o.version},now+4);apply(s,u,{action:'issue',id:o.id,version:o.version},now+5);
 const r=inventoryReport(s,u,'2026-10',now+10).rows.find(r=>r.id===1);assert.deepEqual([r.opening,r.received,r.site,r.outside,r.adjustments,r.closing],[1030,100,50,30,-10,1040]);assert.equal(r.current.reserved,0);
});
test('transit receipts are physical once, expected volume is excluded and FIFO does not make orders ready',async()=>{
 const s=seed(now),o=order(s,9,100),d=await draft(s,[{id:9,qty:50}]);await applyReceipt(s,u,{id:d.id,version:d.version},now+2);
 const r=inventoryReport(s,u,'2026-10',now+3).rows.find(r=>r.id===9);assert.deepEqual([r.opening,r.received,r.closing,r.current.expected],[0,50,50,450]);assert.equal(s.orders[0].items[0].allocated,50);assert.equal(s.orders[0].status,'new');
 await applyReceipt(s,u,{id:d.id,version:d.version},now+4);assert.equal(s.products[8].received,50);assert.equal(s.movements.filter(m=>m.pid===9).length,1);assert.equal(s.movements[0].importId,d.id);
});
test('report respects Almaty month boundaries and does not include later receipts',()=>{
 const start=Date.parse('2026-09-30T18:00:00Z'),s=seed(start);apply(s,u,{action:'receive',id:1,qty:50},Date.parse('2026-09-30T18:59:59Z'));apply(s,u,{action:'receive',id:1,qty:25},Date.parse('2026-09-30T19:00:00Z'));
 const sept=inventoryReport(s,u,'2026-09',now).rows[0],oct=inventoryReport(s,u,'2026-10',now).rows[0];assert.equal(sept.received,50);assert.equal(sept.closing,1080);assert.equal(oct.opening,1080);assert.equal(oct.received,25);
});
test('new offers start at zero and initial physical stock is an explicit adjustment',()=>{
 const s=seed(now);apply(s,u,{action:'offer',product:{baseId:'flora-1',name:'Новый товар',pack:25,price:1000,total:100}},now+1);const p=s.products.at(-1),r=inventoryReport(s,u,'2026-10',now+2).rows.find(r=>r.id===p.id);assert.deepEqual([r.opening,r.adjustments,r.closing],[0,100,100]);assert.equal(s.movements[0].source,'initial');
});
test('legacy accounting migration preserves recorded history without inventing earlier coverage',()=>{
 const s=seed(now);delete s.inventorySince;for(const p of s.products){delete p.ledgerStart;delete p.ledgerOpening;delete p.createdAt;}apply(s,u,{action:'receive',id:1,qty:50},now+1);ensureInventory(s,now+2);const r=inventoryReport(s,u,'2026-10',now+3);assert.equal(r.since,now+1);assert.equal(r.rows[0].opening,1030);assert.equal(inventoryReport(s,u,'2026-09',now+3).rows.length,0);
});
test('preview is a persisted draft; atomic default rejects invalid rows without modifying stock',async()=>{
 const s=seed(now),d=await draft(s,[{id:1,qty:50},{id:999,qty:20}]);assert.equal(s.products[0].total,1030);assert.equal(d.preview[1].errors.length,1);await assert.rejects(()=>applyReceipt(s,u,{id:d.id,version:d.version},now+2),/ошибки/);assert.equal(s.products[0].total,1030);
 const done=await applyReceipt(s,u,{id:d.id,version:d.version,validOnly:true},now+3);assert.equal(done.import.skipped[0].id,999);assert.equal(s.products[0].total,1080);
});
test('duplicate IDs, formulas as values, non-integer quantities and partial packs are rejected per row',async()=>{
 const s=seed(now),d=await draft(s,[{id:1,qty:25},{id:1,qty:25},{id:2,qty:'=25+25'},{id:3,qty:1.5},{id:4,qty:7}]);assert.equal(d.preview.filter(x=>x.errors.length).length,5);await assert.rejects(()=>applyReceipt(s,u,{id:d.id,version:d.version,validOnly:true},now+2),/Нет корректных/);
});
test('a stale preview rejects reserve, price and stock races and requires a refreshed review',async()=>{
 const s=seed(now),d=await draft(s);order(s);await assert.rejects(()=>applyReceipt(s,u,{id:d.id,version:d.version},now+2),/изменились/);assert.equal(s.products[0].total,1030);
 const updated=(await previewReceipt(s,u,{id:d.id,version:d.version},now+3)).import;assert.equal(updated.preview[0].conflict,true);await assert.rejects(()=>applyReceipt(s,u,{id:updated.id,version:updated.version},now+4),/Сверьте/);await applyReceipt(s,u,{id:updated.id,version:updated.version,confirmCurrent:true},now+5);assert.equal(s.products[0].total,1080);assert.equal(s.products[0].reserved,50);
});
test('same operation and identical file cannot add stock twice, including two draft races',async()=>{
 const s=seed(now),d=await draft(s),second=(await previewReceipt(s,u,{operationNo:d.operationNo,fileHash:'a'.repeat(64),rows:d.input},now+2)).import;
 await applyReceipt(s,u,{id:d.id,version:d.version},now+3);assert.equal((await applyReceipt(s,u,{id:second.id,version:second.version},now+4)).duplicate,true);assert.equal(s.products[0].total,1080);
 const duplicate=await previewReceipt(s,u,{operationNo:crypto.randomUUID(),fileHash:d.fileHash,rows:d.input},now+5);assert.equal(duplicate.duplicate,true);
 const next=(await previewReceipt(s,u,{operationNo:d.operationNo,fileHash:d.fileHash,rows:d.input,newReceipt:true},now+6)).import;assert.notEqual(next.operationNo,d.operationNo);assert.equal(next.duplicateOf,d.id);await applyReceipt(s,u,{id:next.id,version:next.version,confirmCurrent:true},now+7);assert.equal(s.products[0].total,1130);
});
test('plan and ownership are checked for template, draft and apply, with no private imports for buyers',async()=>{
 const s=seed(now),d=await draft(s);const other={...u,id:'other'};assert.equal(ownImports(s,buyer).length,0);assert.equal(ownImports(s,other).length,0);await assert.rejects(()=>applyReceipt(s,other,{id:d.id,version:d.version},now+2),/недоступен/);await assert.rejects(()=>receiptTemplate(s,{...u,plan:'Start'},now),/Business/);await assert.rejects(()=>applyReceipt(s,{...u,planUntil:now},{id:d.id,version:d.version},now+1),/Business/);await assert.rejects(()=>previewReceipt(s,u,{fileAuthor:'other'},now),/другого кабинета/);
 const business={...u,plan:'Business'};assert.ok((await receiptTemplate(s,business,now)).rows.every(x=>!x.transit));const transit=await draft(s,[{id:9,qty:25}]);await assert.rejects(()=>applyReceipt(s,business,{id:transit.id,version:1},now+2),/MAX/);
});
test('unversioned drafts require explicit current-value review, can be edited and reject obsolete draft versions',async()=>{
 const s=seed(now),d=await draft(s,[{id:1,qty:25,version:''}],{rows:[{id:1,qty:25}]});assert.equal(d.preview[0].unversioned,true);await assert.rejects(()=>applyReceipt(s,u,{id:d.id,version:d.version},now+2),/Сверьте/);
 const updated=(await previewReceipt(s,u,{id:d.id,version:d.version,rows:[{id:1,qty:50}]},now+3)).import;await assert.rejects(()=>applyReceipt(s,u,{id:d.id,version:d.version},now+4),/Предпросмотр изменён/);await applyReceipt(s,u,{id:updated.id,version:updated.version,confirmCurrent:true},now+5);assert.equal(s.products[0].total,1080);
});
test('calendar exposes only own batches, preserving old obligations after MAX expires',()=>{
 const s=seed(now);assert.equal(supplierCalendar(s,buyer,now).length,0);assert.equal(supplierCalendar(s,u,now).length,1);assert.equal(supplierCalendar(s,{...u,plan:'Start'},now).length,0);const o=order(s,9,50);const batches=supplierCalendar(s,{...u,planUntil:now},now);assert.equal(batches.length,1);assert.equal(batches[0].orders[0].id,o.id);assert.equal(batches[0].expected,500);assert.equal(s.orders[0].status,'new');
});
test('XLSX exports literal strings, never formulas, and archive limits reject oversized expanded content',()=>{
 const bytes=makeWorkbook('Учёт',['Товар','Количество'],[['=HYPERLINK("evil") & <test>',25]]);const xml=strFromU8(boundedUnzip(bytes)['xl/worksheets/sheet1.xml']);assert.ok(xml.includes('t="inlineStr"'));assert.ok(xml.includes('&amp; &lt;test&gt;'));assert.ok(!xml.includes('<f>'));
 assert.throws(()=>boundedUnzip(zipSync({'xl/worksheets/sheet1.xml':new Uint8Array(2097153)})),/2 МБ/);assert.throws(()=>boundedUnzip(new Uint8Array(1048577)),/1 МБ/);
});
test('large catalogs have complete bounded template groups without hiding remaining offers',async()=>{
 const s=seed(now);for(let i=0;i<201;i++)s.products.push({...s.products[0],id:2000+i});
 const first=await receiptTemplate(s,u,now),next=await receiptTemplate(s,u,now,first.nextOffset);
 assert.equal(first.rows.length,200);assert.equal(next.rows.length,10);assert.equal(next.nextOffset,null);assert.equal(new Set([...first.rows,...next.rows].map(r=>r.id)).size,210);
 await assert.rejects(()=>receiptTemplate(s,u,now,-1),/Неверная группа/);
});
