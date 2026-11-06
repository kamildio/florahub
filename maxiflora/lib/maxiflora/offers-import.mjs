import {availableBaseProducts} from './catalog-directory.mjs';
import {apply,DomainError} from './engine.mjs';
import {businessAction} from './business.mjs';
import {inventoryAccess,inventoryVersion,ensureInventory} from './inventory.mjs';
import {publicationDays,stockPublicationActive} from './offer-publication.mjs';
const fail=(m,status=422)=>{throw new DomainError(m,status)};
export const offerHeaders=['ID предложения','ID товара','Товар','Штук в упаковке','Цена упаковки, ₸','Всего, шт.','В пути','Дата поступления','Опубликовать','Версия данных','Номер операции','Кабинет','Срок публикации, дней','Минимальный заказ, шт.'];
export async function offerTemplate(s,u,offset=0,now=Date.now()){
 inventoryAccess(u,now);ensureInventory(s,now);const rows=s.products.filter(p=>p.supplierId===u.id);if(!Number.isSafeInteger(offset)||offset<0||offset>rows.length)fail('Неверная группа предложений.');
 const operationNo=crypto.randomUUID();return {operationNo,author:u.id,total:rows.length,next:offset+200<rows.length?offset+200:null,rows:await Promise.all(rows.slice(offset,offset+200).map(async p=>({id:p.id,baseId:p.baseId,name:p.name,pack:p.pack,minOrderQty:p.minOrderQty??p.pack,price:p.price,total:p.total,transit:p.transit,arrival:p.transit?p.arrival:'',published:p.published,publicationDays:p.publicationDays||7,version:await inventoryVersion(p)}))),baseProducts:availableBaseProducts(s)};
}
async function applyRow(s,u,row,mode,now){
 let p=s.products.find(p=>p.id===row.id&&p.supplierId===u.id);
 if(!p){
  const base=s.baseProducts.find(x=>x.id===row.baseId);
  const r=apply(s,u,{action:'offer',product:{baseId:row.baseId,name:base.name,pack:row.pack,minOrderQty:row.minOrderQty,price:row.price,total:row.total,transit:row.transit,arrival:row.arrival,publicationDays:row.publicationDays}},now);p=s.products.find(p=>p.id===r.id);
 }else{
  await businessAction(s,u,{action:'offer-update',id:p.id,version:await inventoryVersion(p),name:p.name,price:row.price,pack:row.pack,minOrderQty:row.minOrderQty},now);
  if(mode==='count'&&row.total!==p.total){
   if(p.transit){if(row.total<p.reserved||row.total<p.received)fail('Ожидаемый объём ниже принятого количества или резерва.');p.total=row.total;}
   else apply(s,u,{action:'count',id:p.id,qty:row.total,reason:'Импорт проверенного фактического итога'},now);
  }
  if(p.transit)p.arrival=row.arrival;
 }
 if(!p.transit&&p.published&&stockPublicationActive(p,now)&&row.published&&row.publicationDays!==(p.publicationDays??7))fail('Для смены срока активного предложения используйте «Обновить публикацию» в кабинете.');
 if(!p.published||!stockPublicationActive(p,now))p.publicationDays=row.publicationDays;
 if(row.published&&!p.transit&&!stockPublicationActive(p,now))p.published=false;
 if(row.published!==p.published)apply(s,u,{action:'publish',id:p.id,publicationDays:row.publicationDays,confirmFresh:true},now);
 return p.id;
}
export async function previewOffers(s,u,b,now=Date.now()){
 inventoryAccess(u,now);s.offerImports??=[];
 const old=b.id?s.offerImports.find(x=>x.id===b.id&&x.supplierId===u.id):null;if(b.id&&!old)fail('Черновик недоступен.',403);if(old?.status==='applied')return {import:old,duplicate:true};if(old&&old.version!==b.version)fail('Черновик изменился. Обновите запись.',409);
 const operationNo=old?.operationNo||b.operationNo,fileHash=old?.fileHash||b.fileHash,mode=b.mode||old?.mode||'prices';
 if(b.fileAuthor&&b.fileAuthor!==u.id)fail('Шаблон другого кабинета.',403);
 if(!['prices','count'].includes(mode)||!/^[-a-zA-Z0-9]{16,80}$/.test(operationNo||'')||!/^[a-f0-9]{64}$/.test(fileHash||''))fail('Неверный формат операции импорта.');
 const duplicate=s.offerImports.find(x=>x.supplierId===u.id&&(x.fileHash===fileHash||x.operationNo===operationNo)&&x.id!==old?.id);if(duplicate)return {import:duplicate,duplicate:duplicate.status==='applied'};
 const input=b.rows??old?.input;if(!Array.isArray(input)||!input.length||input.length>200)fail('Требуется от 1 до 200 строк.');
 const rows=input.map((x,i)=>({row:Number.isSafeInteger(x?.row)?x.row:i+2,id:x?.id??null,baseId:typeof x?.baseId==='string'?x.baseId.slice(0,100):'',minOrderQty:x?.minOrderQty,pack:x?.pack,price:x?.price,total:x?.total,transit:x?.transit,published:x?.published,publicationDays:x?.publicationDays===undefined?(s.products.find(p=>p.id===x?.id&&p.supplierId===u.id)?.publicationDays??7):x.publicationDays,arrival:typeof x?.arrival==='string'?x.arrival.slice(0,20):'',version:typeof x?.version==='string'?x.version.slice(0,100):''}));
 const preview=[];for(const row of rows){
  const errors=[],p=s.products.find(p=>p.id===row.id&&p.supplierId===u.id),base=s.baseProducts.find(x=>x.id===row.baseId);
  if(row.id!==null&&!p)errors.push('ID предложения не найден в вашем кабинете');
  if(row.id!==null&&rows.some(r=>r!==row&&r.id===row.id))errors.push('Дублирующий ID предложения');
  if(!base)errors.push('ID базового товара отсутствует в справочнике');
  if(p&&p.baseId!==row.baseId)errors.push('Нельзя заменить базовый товар существующего предложения');
  if(!Number.isSafeInteger(row.pack)||row.pack<1||row.pack>1000000)errors.push('Фасовка — положительное целое число');
  if(!Number.isSafeInteger(row.price)||row.price<1||row.price>1000000000)errors.push('Цена упаковки — положительное целое число');
  if(!Number.isSafeInteger(row.total)||row.total<0||row.total>1000000000)errors.push('Остаток — целое число от 0 до 1 000 000 000');
  if(typeof row.transit!=='boolean'||typeof row.published!=='boolean')errors.push('Статусы задаются значениями Да или Нет');
  try{publicationDays(row.publicationDays)}catch(e){errors.push(e.message)}
  if(p&&row.transit!==p.transit)errors.push('Наличие и партия в пути не заменяют друг друга; создайте отдельное предложение');
  if(row.transit&&u.plan!=='MAX')errors.push('Новые условия партий в пути доступны MAX');
  if(row.transit&&(!/^\d{4}-\d{2}-\d{2}$/.test(row.arrival)||!Number.isFinite(Date.parse(row.arrival+'T12:00:00Z'))||new Date(row.arrival+'T12:00:00Z').toISOString().slice(0,10)!==row.arrival||row.arrival<new Date(now+5*3600000).toISOString().slice(0,10)))errors.push('Нужна действующая дата поступления');
  const version=p?await inventoryVersion(p):null;
  if(!errors.length){try{await applyRow(structuredClone(s),u,row,mode,now)}catch(e){if(!(e instanceof DomainError))throw e;if(!e.message.includes('Достигнут лимит'))errors.push(e.message)}}
  preview.push({...row,name:base?.name||'—',before:p?{price:p.price,total:p.total,pack:p.pack,published:p.published,publicationUntil:p.publicationUntil}:null,needsFreshConfirmation:row.published&&!row.transit&&(!p||!p.published||!stockPublicationActive(p,now)),afterTotal:p&&mode==='prices'?p.total:row.total,currentVersion:version,conflict:!!p&&row.version!==version,errors});
 }
 const copy=structuredClone(s);let globalError='';
 try{for(const row of preview.filter(x=>!x.errors.length).sort((a,b)=>Number(a.published)-Number(b.published)))await applyRow(copy,u,row,mode,now)}catch(e){if(!(e instanceof DomainError))throw e;globalError=e.message;}
 const record={id:old?.id||crypto.randomUUID(),supplierId:u.id,author:u.id,operationNo,fileHash,filename:old?.filename||String(b.filename||'Предложения.xlsx').slice(0,150),mode,version:(old?.version||0)+1,created:old?.created||now,updated:now,status:'draft',input:rows,preview,globalError};
 if(old)s.offerImports[s.offerImports.indexOf(old)]=record;else s.offerImports.unshift(record);return {import:record};
}
export async function applyOffers(s,u,b,now=Date.now()){
 inventoryAccess(u,now);const r=(s.offerImports||[]).find(x=>x.id===b.id&&x.supplierId===u.id);if(!r)fail('Импорт недоступен.',403);if(r.status==='applied')return {import:r,duplicate:true};if(r.version!==b.version)fail('Черновик изменился.',409);
 const duplicate=s.offerImports.find(x=>x.supplierId===u.id&&x.status==='applied'&&(x.operationNo===r.operationNo||x.fileHash===r.fileHash));if(duplicate)return {import:duplicate,duplicate:true};
 if(r.globalError)fail(r.globalError);if(r.preview.some(x=>x.errors.length)&&b.validOnly!==true)fail('В файле есть ошибки. Исправьте строки либо явно выберите только корректные.');
 const rows=r.preview.filter(x=>!x.errors.length);if(!rows.length)fail('Нет корректных строк.');if(b.confirmCurrent!==true)fail('Подтвердите проверку цен и выбранного режима количества.');
 if(rows.some(x=>x.needsFreshConfirmation)&&b.confirmFresh!==true)fail('Подтвердите актуальность остатка, цены и свежесть цветов для публикации.');
 for(const row of rows){const p=s.products.find(x=>x.id===row.id&&x.supplierId===u.id);if(row.published&&!row.transit&&p&&!stockPublicationActive(p,now)&&!row.needsFreshConfirmation)fail('Срок публикации истёк после проверки. Обновите предпросмотр.',409);}
 for(const row of rows)if(row.id!==null){const p=s.products.find(x=>x.id===row.id&&x.supplierId===u.id);if(!p||await inventoryVersion(p)!==row.currentVersion)fail('Данные изменились после предпросмотра. Обновите проверку.',409);}
 const next=structuredClone(s),result=[];for(const row of [...rows].sort((a,b)=>Number(a.published)-Number(b.published))){const id=await applyRow(next,u,row,r.mode,now);result.push({id,row:row.row,name:row.name,price:row.price,total:row.afterTotal});}
 const record=next.offerImports.find(x=>x.id===r.id);Object.assign(record,{status:'applied',appliedAt:now,version:r.version+1,result,skipped:r.preview.filter(x=>x.errors.length).map(x=>({row:x.row,errors:x.errors}))});Object.assign(s,next);return {import:record};
}
