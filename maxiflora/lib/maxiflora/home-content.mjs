import {DomainError} from './engine.mjs';
import {requireStaffConfirmation,openSecret} from './staff-security.mjs';
const fail=(message,status=422)=>{throw new DomainError(message,status)};
import {homeAssets} from './home-assets.mjs';
export {homeAssets} from './home-assets.mjs';
const destinations=['catalog','board','tariffs','supplier','news'];
const defaults=()=>({revision:1,items:[{id:'business-fox',version:1,type:'banner',asset:'business-fox',languages:'ru',ru:{title:'Магазинам — проще закупать. Поставщикам — проще продавать.',description:'',body:'',cta:'Перейти в каталог'},kk:{title:'',description:'',body:'',cta:''},destination:'catalog',startsAt:0,endsAt:null,position:1,status:'published',createdAt:null,updatedAt:null,publishedAt:null}],audit:[]});
export function ensureHomeContent(s){return s.homeContent??=defaults();}
const content=s=>s.homeContent||defaults();
export function publicHomeContent(s,now=Date.now()){
 return content(s).items.filter(x=>x.status==='published'&&x.startsAt<=now&&(x.endsAt===null||now<x.endsAt)).sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id)).map(x=>({id:x.id,type:x.type,asset:x.asset,languages:x.languages,ru:{...x.ru},kk:{...x.kk},destination:x.destination,startsAt:x.startsAt,endsAt:x.endsAt}));
}
export async function requireHomeEditor(s,u,ctx,critical,now){
 const permission=requireStaffConfirmation(s,u,ctx,{critical,now});
 // Also reject cached MFA sessions when the configured encryption key no longer opens the record.
 await openSecret(s.staffSecurity[u.id].secret,u.id,ctx);return permission;
}
export async function homeContentView(s,u,ctx,now=Date.now()){
 let homeContentAdmin=null;
 try{await requireHomeEditor(s,u,ctx,false,now);const c=content(s);homeContentAdmin={revision:c.revision,items:structuredClone(c.items),assets:homeAssets.map(x=>({...x})),audit:c.audit.slice(-50).reverse().map(x=>({...x}))};}catch(e){if(!(e instanceof DomainError))throw e;}
 return {homeBanners:publicHomeContent(s,now),homeContentAdmin};
}
function text(value,max,required=false){if(typeof value!=='string'||value.length>max||required&&!value.trim())fail('Проверьте обязательный текст и допустимую длину.');return value.trim();}
function locale(v,required){if(!v||typeof v!=='object'||Array.isArray(v))fail('Заполните текст баннера.');return {title:text(v.title,120,required),description:text(v.description,240),body:text(v.body,5000),cta:text(v.cta,40,required)};}
function draft(b){
 if(!['banner','news'].includes(b.type)||!['ru','kk','both'].includes(b.languages)||!destinations.includes(b.destination))fail('Выберите тип, язык и переход материала.');
 const asset=homeAssets.find(x=>x.id===b.asset);if(!asset||asset.ruOnly&&b.languages!=='ru')fail('Выберите доступное изображение для языка материала.');
 const ru=locale(b.ru,b.languages!=='kk'),kk=locale(b.kk,b.languages!=='ru');
 if(b.type==='news'&&b.destination!=='news'||b.type==='banner'&&b.destination==='news')fail('Для новости используйте переход к её тексту.');
 for(const l of b.languages==='both'?['ru','kk']:[b.languages])if(b.type==='news'&&!({ru,kk}[l].body))fail('Добавьте полный текст новости на выбранном языке.');
 if(!Number.isSafeInteger(b.startsAt)||b.startsAt<0||b.startsAt>Date.UTC(2100,0,1))fail('Укажите начало показа.');
 if(b.endsAt!==null&&(!Number.isSafeInteger(b.endsAt)||b.endsAt<=b.startsAt||b.endsAt>Date.UTC(2100,0,1)))fail('Окончание должно быть позже начала показа.');
 return {type:b.type,asset:b.asset,languages:b.languages,ru,kk,destination:b.destination,startsAt:b.startsAt,endsAt:b.endsAt};
}
const fingerprint=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({...b,operationId:undefined})))),x=>x.toString(16).padStart(2,'0')).join('');
function record(c,u,event,item,now){c.audit.push({id:crypto.randomUUID(),actorId:u.id,event,itemId:item?.id||null,title:item?.ru.title||item?.kk.title||'',revision:c.revision,time:now});}
export function homeContentDenial(s,u,action,status,now){const c=ensureHomeContent(s);c.audit.push({id:crypto.randomUUID(),actorId:u?.id||null,event:'denied',action:['save','publish','withdraw','reorder'].includes(action)?action:'unknown',status,revision:c.revision,time:now});}
export async function homeContentAction(s,u,b,ctx,now=Date.now()){
 await requireHomeEditor(s,u,ctx,true,now);
 if(!['save','publish','withdraw','reorder'].includes(b.action))fail('Недоступное действие редактора.');
 if(typeof b.operationId!=='string'||!/^[-a-zA-Z0-9]{16,80}$/.test(b.operationId))fail('Не указан идентификатор операции.',400);
 const fp=await fingerprint(b),key=u.id+':home-content:'+b.operationId,prior=s.receipts?.[key];
 if(prior){if(prior.fingerprint!==fp)fail('Идентификатор уже использован для другой операции.',409);return prior.result;}
 const c=ensureHomeContent(s);if(!Number.isSafeInteger(b.revision)||b.revision!==c.revision)fail('Материалы изменились. Обновите редактор перед сохранением.',409);
 let result;
 if(b.action==='save'){
  const data=draft(b),old=b.id?c.items.find(x=>x.id===b.id):null;if(b.id&&!old)fail('Материал недоступен.',404);
  const item=old||{id:crypto.randomUUID(),version:0,position:c.items.reduce((n,x)=>Math.max(n,x.position),0)+1,createdAt:now};
  Object.assign(item,data,{version:item.version+1,status:'draft',updatedAt:now,updatedBy:u.id});if(!old)c.items.push(item);
  c.revision++;record(c,u,'saved-draft',item,now);result={id:item.id,revision:c.revision};
 }else if(b.action==='reorder'){
  if(!Array.isArray(b.ids)||b.ids.length!==c.items.length||new Set(b.ids).size!==c.items.length||b.ids.some(id=>!c.items.some(x=>x.id===id)))fail('Порядок должен содержать все текущие материалы без повторов.');
  b.ids.forEach((id,i)=>{const item=c.items.find(x=>x.id===id);item.position=i+1;});c.revision++;record(c,u,'reordered',null,now);result={revision:c.revision};
 }else{
  const item=c.items.find(x=>x.id===b.id);if(!item)fail('Материал недоступен.',404);
  if(b.action==='publish'){draft(item);if(item.endsAt!==null&&item.endsAt<=now)fail('Срок показа закончился. Измените даты в черновике.');item.status='published';item.publishedAt=now;}
  else item.status='withdrawn';item.version++;item.updatedAt=now;item.updatedBy=u.id;c.revision++;record(c,u,b.action,item,now);result={id:item.id,revision:c.revision};
 }
 s.receipts??={};s.receipts[key]={fingerprint:fp,result,time:now};return result;
}
