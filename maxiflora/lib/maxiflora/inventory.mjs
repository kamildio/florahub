import {DomainError,apply,terminal,free,allocateAll} from './engine.mjs';
const fail=(text,status=422)=>{throw new DomainError(text,status)};
const physical=p=>p.transit?p.received:p.total;
const digest=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(x=>x.toString(16).padStart(2,'0')).join('');
export const inventoryVersion=p=>digest([p.id,p.baseId,p.name,p.total,p.received,p.reserved,p.price,p.pack,p.minOrderQty??p.pack,p.transit,p.arrival,p.published,p.address,p.holdSales||null,p.publicationDays,p.publicationStartedAt,p.publicationUntil,p.publicationRevision||0,p.catalogRevision||0]);
export function inventoryAccess(u,now=Date.now()){
 if(!u?.supplier)fail('Нужен профиль поставщика.',403);
 if(!['Business','MAX'].includes(u.plan)||!(u.planUntil>now))fail('Импорт и складской отчёт доступны с действующим Business или MAX.',403);
}
// Existing workspaces retain all recorded movements. Coverage starts with the earliest known event;
// the first month's opening is explicitly the opening at the start of available accounting.
export function ensureInventory(s,now=Date.now()){
 s.inventoryImports??=[];
 s.baseProducts??=[];for(const p of s.products){if(!p.baseId){const known=s.baseProducts.find(b=>b.name===p.name&&b.category===p.category&&b.height===p.height&&b.origin===p.origin);if(known)p.baseId=known.id;else{p.baseId='legacy-'+p.id;s.baseProducts.push({id:p.baseId,...Object.fromEntries(['name','category','origin','height','kind','color'].map(k=>[k,p[k]]))});}}}
 s.inventorySince??=Math.min(now,...s.movements.map(m=>m.time));
 for(const p of s.products){
  if(p.ledgerStart!==undefined)continue;
  const moves=s.movements.filter(m=>m.pid===p.id);
  p.ledgerStart=p.createdAt??s.inventorySince;
  p.ledgerOpening=physical(p)-moves.reduce((n,m)=>n+m.qty,0);
 }
 allocateAll(s,now);
}
export function inventoryReport(s,u,month,now=Date.now()){
 inventoryAccess(u,now);ensureInventory(s,now);
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month||''))fail('Выберите месяц отчёта.');
 const start=Date.parse(month+'-01T00:00:00+05:00');
 const [year,m]=month.split('-').map(Number),end=Date.UTC(year,m,1)-5*3600000;
 if(start>now)fail('Отчёт за будущий месяц ещё недоступен.');
 const until=Math.min(end,now+1),products=s.products.filter(p=>p.supplierId===u.id);
 const rows=products.filter(p=>p.ledgerStart<until).map(p=>{
  const from=Math.max(start,p.ledgerStart),moves=s.movements.filter(x=>x.pid===p.id);
  const opening=p.ledgerOpening+moves.filter(x=>x.time<from).reduce((n,x)=>n+x.qty,0);
  const during=moves.filter(x=>x.time>=from&&x.time<until);
  const sum=kind=>during.filter(x=>x.kind===kind).reduce((n,x)=>n+x.qty,0);
  const received=sum('receive'),site=-sum('issue'),outside=-sum('outside');
  const adjustments=during.filter(x=>!['receive','issue','outside'].includes(x.kind)).reduce((n,x)=>n+x.qty,0);
  return {id:p.id,name:p.name,pack:p.pack,transit:p.transit,arrival:p.arrival,opening,received,site,outside,adjustments,closing:opening+received-site-outside+adjustments,from,
   current:{physical:physical(p),reserved:p.reserved,free:Math.max(0,physical(p)-p.reserved),available:free(p),expected:p.transit?p.total-p.received:0}};
 });
 return {month,start,end,asOf:now,since:products.length?Math.min(...products.map(p=>p.ledgerStart)):now,rows};
}
export function supplierCalendar(s,u,now=Date.now()){
 if(!u?.supplier)return [];
 const max=u.plan==='MAX'&&u.planUntil>now;
 return s.products.filter(p=>p.supplierId===u.id&&!p.physicalPartOf&&(p.transit||p.batchSourceId)&&(max||p.reserved>0||s.products.find(x=>x.id===p.stockPartId)?.reserved>0)).map(p=>{
  const part=s.products.find(x=>x.id===p.stockPartId),ids=[p.id,part?.id];
  return {id:p.id,name:p.name,arrival:p.arrival,total:p.total+(part?.total||0),received:(p.transit?p.received:p.total)+(part?.total||0),reserved:p.reserved+(part?.reserved||0),expected:p.transit?p.total-p.received:0,pack:p.pack,stockPartId:part?.id,
   orders:s.orders.filter(o=>o.supplierId===u.id&&!terminal(o)&&o.items.some(x=>ids.includes(x.pid))).map(o=>({id:o.id,buyer:o.buyer,status:o.status,qty:o.items.filter(x=>ids.includes(x.pid)).reduce((n,x)=>n+x.qty,0),allocated:o.items.filter(x=>ids.includes(x.pid)).reduce((n,x)=>n+(x.allocated||0),0)}))};
 });
}

export async function receiptTemplate(s,u,now=Date.now(),offset=0){
 inventoryAccess(u,now);
 const products=s.products.filter(p=>p.supplierId===u.id&&(!p.transit||u.plan==='MAX')).sort((a,b)=>a.id-b.id);
 if(!Number.isSafeInteger(offset)||offset<0||offset>products.length)fail('Неверная группа предложений.');
 return {schema:'maxiflora-receipt-v1',operationNo:crypto.randomUUID(),author:u.id,created:now,total:products.length,offset,nextOffset:offset+200<products.length?offset+200:null,
  rows:await Promise.all(products.slice(offset,offset+200).map(async p=>({id:p.id,name:p.name,qty:0,version:await inventoryVersion(p),physical:physical(p),pack:p.pack,transit:p.transit,arrival:p.arrival})))};
}
export function ownImports(s,u){return u?.supplier?(s.inventoryImports||[]).filter(x=>x.supplierId===u.id):[];}
function existingImport(s,u,id){const r=ownImports(s,u).find(x=>x.id===id);if(!r)fail('Импорт недоступен.',403);return r;}
export async function previewReceipt(s,u,b,now=Date.now()){
 inventoryAccess(u,now);ensureInventory(s,now);
 if(b.fileAuthor&&b.fileAuthor!==u.id)fail('Этот шаблон выгружен из другого кабинета.',403);
 const previous=b.id?existingImport(s,u,b.id):null;
 if(previous?.status==='applied')return {import:previous,duplicate:true};
 if(previous&&b.version!==previous.version)fail('Черновик изменён. Откройте актуальную запись.',409);
 const rows=b.rows??previous?.input;
 if(!Array.isArray(rows)||!rows.length||rows.length>200)fail('Файл должен содержать от 1 до 200 строк.');
 const fileHash=previous?.fileHash||b.fileHash;
 if(!/^[a-f0-9]{64}$/.test(fileHash||''))fail('Не удалось проверить файл. Загрузите его заново.');
 const op=previous?.operationNo||b.operationNo;
 if(typeof op!=='string'||!/^[-a-zA-Z0-9]{16,80}$/.test(op))fail('В файле неверный номер операции. Скачайте новый шаблон.');
 const applied=ownImports(s,u).find(x=>x.status==='applied'&&(x.operationNo===op||x.fileHash===fileHash));
 if(applied&&b.newReceipt!==true)return {import:applied,duplicate:true};
 if(applied&&previous)fail('Для нового реального поступления создайте отдельную операцию.');
 const existingDraft=!previous&&ownImports(s,u).find(x=>x.status==='draft'&&x.fileHash===fileHash);
 if(existingDraft&&b.newReceipt!==true)return {import:existingDraft};
 const normalized=rows.map((x,i)=>({row:Number.isSafeInteger(x?.row)&&x.row>=2?x.row:i+2,id:x?.id,qty:x?.qty,version:typeof x?.version==='string'?x.version.slice(0,100):''}));
 const duplicates=new Set(normalized.filter((x,i,a)=>a.some((y,j)=>i!==j&&x.id===y.id)).map(x=>x.id));
 const preview=await Promise.all(normalized.map(async x=>{
  const p=s.products.find(p=>p.id===x.id&&p.supplierId===u.id),errors=[];
  if(!p)errors.push('ID предложения не найден в вашем кабинете');
  if(!Number.isSafeInteger(x.qty)||x.qty<0||x.qty>1000000000)errors.push('Количество — целое число от 0 до 1 000 000 000');
  if(duplicates.has(x.id))errors.push('ID повторяется в файле');
  if(p&&x.qty>0){if(p.transit&&u.plan!=='MAX')errors.push('Импорт партий в пути требует MAX');if(x.qty%p.pack)errors.push('Приёмка полными упаковками по '+p.pack+' шт.');if(p.transit&&x.qty>p.total-p.received)errors.push('Превышен ожидаемый остаток партии');if(!Number.isSafeInteger(physical(p)+x.qty))errors.push('Слишком большое количество');}
  const version=p?await inventoryVersion(p):null;
  return {...x,name:p?.name||'—',before:p?physical(p):null,after:p&&Number.isSafeInteger(x.qty)?physical(p)+x.qty:null,pack:p?.pack,transit:!!p?.transit,currentVersion:version,conflict:!!x.version&&x.version!==version,unversioned:!x.version,errors};
 }));
 const record={id:previous?.id||crypto.randomUUID(),supplierId:u.id,author:u.id,operationNo:applied?crypto.randomUUID():op,fileHash,filename:previous?.filename||String(b.filename||'Поступление.xlsx').slice(0,150),status:'draft',created:previous?.created||now,updated:now,version:(previous?.version||0)+1,input:normalized,preview,duplicateOf:previous?.duplicateOf||applied?.id||null};
 if(previous)s.inventoryImports[s.inventoryImports.indexOf(previous)]=record;else s.inventoryImports.unshift(record);
 return {import:record};
}
export async function applyReceipt(s,u,b,now=Date.now()){
 inventoryAccess(u,now);const record=existingImport(s,u,b.id);
 if(record.status==='applied')return {import:record,duplicate:true};
 const duplicate=ownImports(s,u).find(x=>x.status==='applied'&&(x.operationNo===record.operationNo||(!record.duplicateOf&&x.fileHash===record.fileHash)));
 if(duplicate)return {import:duplicate,duplicate:true};
 if(record.version!==b.version)fail('Предпросмотр изменён. Откройте актуальный черновик.',409);
 const errors=record.preview.some(x=>x.errors.length);
 if(errors&&b.validOnly!==true)fail('Исправьте ошибки или явно выберите только корректные строки.');
 const rows=record.preview.filter(x=>!x.errors.length&&x.qty>0);
 if(!rows.length)fail('Нет корректных строк с положительным поступлением.');
 if(rows.some(x=>x.conflict||x.unversioned)&&b.confirmCurrent!==true)fail('Сверьте текущие значения сайта и подтвердите предпросмотр.');
 for(const x of rows){const p=s.products.find(p=>p.id===x.id&&p.supplierId===u.id);if(!p||await inventoryVersion(p)!==x.currentVersion)fail('Остаток, резерв или цена изменились. Обновите предпросмотр.',409);}
 // Validate the complete operation on a copy, including current tariff and transit constraints.
 const next=structuredClone(s);
 for(const x of rows){
  const p=next.products.find(p=>p.id===x.id);
  if(p.transit&&u.plan!=='MAX')fail('Импорт партий в пути требует MAX.',403);
  apply(next,u,{action:'receive',id:x.id,qty:x.qty,reason:'Импорт поступления '+record.operationNo},now);
  Object.assign(next.movements[0],{actor:u.id,source:'xlsx',importId:record.id,operationNo:record.operationNo});
 }
 const completed=next.inventoryImports.find(x=>x.id===record.id);
 Object.assign(completed,{status:'applied',appliedAt:now,appliedBy:u.id,version:completed.version+1,result:rows.map(x=>({id:x.id,name:x.name,qty:x.qty,before:x.before,after:x.after})),skipped:record.preview.filter(x=>x.errors.length||x.qty===0).map(x=>({row:x.row,id:x.id,errors:x.errors,qty:x.qty})),validOnly:!!b.validOnly});
 Object.assign(s,next);return {import:completed};
}
