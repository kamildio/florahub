import {DomainError} from './engine.mjs';
import {requireHomeEditor} from './home-content.mjs';
import {ensureDirectory,directory,publicCategories} from './catalog-directory.mjs';
const fail=(message,status=422)=>{throw new DomainError(message,status)};
const plain=(value,max,required=true)=>{if(typeof value!=='string'||value.trim().length>max||required&&!value.trim()||/[\u0000-\u001f\u007f<>]/.test(value))fail('Проверьте текст: обязательные поля, длину и недопустимые символы.');return value.trim()};
const normalized=s=>s.trim().normalize('NFKC').toLocaleLowerCase('ru-RU');
const fingerprint=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({...b,operationId:undefined})))),x=>x.toString(16).padStart(2,'0')).join('');
export function catalogAdminDenial(s,u,action,status,now){const c=ensureDirectory(s);c.audit.push({id:crypto.randomUUID(),actorId:u?.id||null,event:'denied',action:['category-save','category-status','category-reorder','product-save','product-status'].includes(action)?action:'unknown',status,time:now});c.audit=c.audit.slice(-500);}
export async function catalogAdminView(s,u,ctx,now=Date.now()){
 let catalogAdmin=null;
 try{await requireHomeEditor(s,u,ctx,false,now);const c=directory(s);catalogAdmin={revision:c.revision,categories:c.categories.map(x=>({...x,baseCount:(s.baseProducts||[]).filter(p=>p.category===x.key).length,offerCount:(s.products||[]).filter(p=>p.category===x.key).length})),products:(s.baseProducts||[]).map(x=>({...x,archived:x.archived===true,offerCount:(s.products||[]).filter(p=>p.baseId===x.id).length})),audit:c.audit.slice(-50).reverse()};}catch(e){if(!(e instanceof DomainError))throw e;}
 return {catalogCategories:publicCategories(s),catalogAdmin};
}
export async function catalogAdminAction(s,u,b,ctx,now=Date.now()){
 await requireHomeEditor(s,u,ctx,true,now);
 if(!['category-save','category-status','category-reorder','product-save','product-status'].includes(b.action))fail('Действие справочника недоступно.');
 if(typeof b.operationId!=='string'||!/^[-a-zA-Z0-9]{16,80}$/.test(b.operationId))fail('Не указан идентификатор операции.',400);
 const fp=await fingerprint(b),receiptKey=u.id+':catalog-admin:'+b.operationId,prior=s.receipts?.[receiptKey];if(prior){if(prior.fingerprint!==fp)fail('Идентификатор уже использован для другой операции.',409);return prior.result;}
 const c=ensureDirectory(s);if(!Number.isSafeInteger(b.revision)||b.revision!==c.revision)fail('Справочник изменился. Обновите данные перед сохранением.',409);
 let id,previous=null,current=null;
 if(b.action==='category-save'){
  const ru=plain(b.ru,80),kk=plain(b.kk,80,false),old=b.id?c.categories.find(x=>x.id===b.id):null;if(b.id&&!old)fail('Категория не найдена.',404);
  if(c.categories.some(x=>x.id!==old?.id&&(normalized(x.ru)===normalized(ru)||kk&&x.kk&&normalized(x.kk)===normalized(kk))))fail('Категория с таким названием уже существует.',409);
  if(!old&&c.categories.length>=200)fail('Достигнут лимит 200 категорий.');
  const row=old||{id:crypto.randomUUID(),key:'category-'+crypto.randomUUID(),active:true,position:Math.max(0,...c.categories.map(x=>x.position))+1};previous=old?structuredClone(old):null;Object.assign(row,{ru,kk});if(!old)c.categories.push(row);id=row.id;current=structuredClone(row);
 }else if(b.action==='category-reorder'){
  if(!Array.isArray(b.ids)||b.ids.length!==c.categories.length||new Set(b.ids).size!==c.categories.length||b.ids.some(id=>!c.categories.some(x=>x.id===id)))fail('Порядок должен содержать все категории без повторов.');
  previous=c.categories.slice().sort((a,b)=>a.position-b.position).map(x=>x.id);b.ids.forEach((id,i)=>{c.categories.find(x=>x.id===id).position=i+1});current=[...b.ids];
 }else if(b.action==='category-status'){
  const row=c.categories.find(x=>x.id===b.id);if(!row)fail('Категория не найдена.',404);if(typeof b.active!=='boolean')fail('Укажите видимость категории.');previous={active:row.active};row.active=b.active;id=row.id;current={active:row.active};
 }else if(b.action==='product-save'){
  const old=b.id?(s.baseProducts||[]).find(x=>x.id===b.id):null;if(b.id&&!old)fail('Товар не найден.',404);
  const category=c.categories.find(x=>x.key===b.category);if(!category||!category.active)fail('Выберите доступную категорию.');
  const data={name:plain(b.name,120),category:category.key,origin:plain(b.origin,80),height:b.height,kind:b.kind,color:b.color};
  if(!Number.isSafeInteger(data.height)||data.height<0||data.height>300||!['rose','tulip','hydrangea','green','daisy','plant'].includes(data.kind)||!/^#[a-f0-9]{6}$/i.test(data.color||''))fail('Проверьте длину (0–300 см), вид изображения и цвет.');
  if((s.baseProducts||[]).some(x=>x.id!==old?.id&&normalized(x.name)===normalized(data.name)&&x.height===data.height&&normalized(x.origin)===normalized(data.origin)))fail('Товар с таким названием, страной и длиной уже есть.',409);
  if(!old&&(s.baseProducts||[]).length>=5000)fail('Достигнут лимит справочника.');
  const related=old?(s.products||[]).filter(p=>p.baseId===old.id):[];
  if(data.category==='Растения'&&related.some(p=>p.pack!==1))fail('Этот товар используется с упаковками. Нельзя перевести его в поштучные растения.');
  const row=old||{id:'flora-'+crypto.randomUUID(),archived:false};previous=old?structuredClone(old):null;Object.assign(row,data);s.baseProducts??=[];if(!old)s.baseProducts.push(row);
  // Order lines already contain their own snapshots. Prices, stocks and publication dates are untouched.
  for(const p of related){Object.assign(p,data);p.catalogRevision=(p.catalogRevision||0)+1;}
  id=row.id;current=structuredClone(row);
 }else{
  const row=(s.baseProducts||[]).find(x=>x.id===b.id);if(!row)fail('Товар не найден.',404);if(typeof b.archived!=='boolean')fail('Укажите статус товара.');previous={archived:!!row.archived};row.archived=b.archived;id=row.id;current={archived:row.archived};
 }
 c.revision++;c.audit.push({id:crypto.randomUUID(),actorId:u.id,event:b.action,itemId:id||null,before:previous,after:current,time:now,revision:c.revision});c.audit=c.audit.slice(-500);
 const result={ok:true,id,revision:c.revision};s.receipts??={};s.receipts[receiptKey]={fingerprint:fp,result,time:now};return result;
}
