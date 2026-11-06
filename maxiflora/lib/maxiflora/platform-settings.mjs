import {siteCopyFields,siteCopy,supportContacts} from './site-copy.mjs';
import {DomainError} from './engine.mjs';
import {requireHomeEditor} from './home-content.mjs';
import {tariffPlans,tariffPlansFor,tariffRevision,captureTariffGrant} from './launch-policy.mjs';
import {cityDirectory,activeCities,cityInUse} from './cities.mjs';
const fail=(message,status=422)=>{throw new DomainError(message,status)};
const defaults=s=>({revision:1,tariffRevision:1,tariffs:tariffPlans.map(p=>({...p})),cities:cityDirectory(s),audit:[]});
export const ensurePlatformSettings=s=>s.platformSettings??=defaults(s);
export const publicPlatformSettings=s=>({cities:activeCities(s),tariffPlans:tariffPlansFor(s).map(p=>({...p})),tariffRevision:tariffRevision(s),siteCopy:siteCopy(s),supportContacts:supportContacts(s)});
const actions=['tariff-save','city-add','city-status','city-reorder','content-save'];
const text=(v,max)=>{if(typeof v!=='string'||!v.trim()||v.trim().length>max||/[\u0000-\u001f\u007f<>]/.test(v))fail('Проверьте текст и допустимую длину.');return v.trim()};
const normalize=v=>v.normalize('NFKC').toLocaleLowerCase('ru-RU');
const fingerprint=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({...b,operationId:undefined})))),x=>x.toString(16).padStart(2,'0')).join('');
export function platformSettingsDenial(s,u,action,status,now){const c=ensurePlatformSettings(s);c.audit.push({id:crypto.randomUUID(),actorId:u?.id||null,event:'denied',action:actions.includes(action)?action:'unknown',status,time:now});c.audit=c.audit.slice(-500);}
export async function platformSettingsView(s,u,ctx,now=Date.now()){
 let platformSettingsAdmin=null;
 try{await requireHomeEditor(s,u,ctx,false,now);const c=s.platformSettings||defaults(s);platformSettingsAdmin={revision:c.revision,siteCopy:siteCopy(s),supportContacts:supportContacts(s),tariffRevision:c.tariffRevision,tariffs:c.tariffs.map(p=>({...p})),cities:c.cities.map(x=>({...x,inUse:cityInUse(s,x.name)})),audit:c.audit.slice(-50).reverse()};}catch(e){if(!(e instanceof DomainError))throw e;}
 return {...publicPlatformSettings(s),platformSettingsAdmin};
}
export async function platformSettingsAction(s,u,b,ctx,now=Date.now()){
 await requireHomeEditor(s,u,ctx,true,now);
 if(!actions.includes(b.action))fail('Действие настроек недоступно.');
 if(typeof b.operationId!=='string'||!/^[-a-zA-Z0-9]{16,80}$/.test(b.operationId))fail('Не указан идентификатор операции.',400);
 const fp=await fingerprint(b),key=u.id+':platform-settings:'+b.operationId,prior=s.receipts?.[key];if(prior){if(prior.fingerprint!==fp)fail('Идентификатор уже использован для другой операции.',409);return prior.result;}
 const c=ensurePlatformSettings(s);if(!Number.isSafeInteger(b.revision)||b.revision!==c.revision)fail('Настройки изменились. Обновите данные перед сохранением.',409);
 let id=null,before=null,after=null;
 if(b.action==='content-save'){
  if(!['home','about','contacts'].includes(b.section))fail('Выберите раздел текстов.');
  id=b.section;
  if(b.section==='contacts'){
   if(typeof b.phone!=='string'||!/^\+7[0-9]{10}$/.test(b.phone)||typeof b.email!=='string'||b.email.length>254||!/^([^\s@]+)@([^\s@]+)\.[^\s@]+$/.test(b.email))fail('Укажите телефон +7XXXXXXXXXX и корректный email.');
   before=supportContacts(s);after={phone:b.phone,email:b.email.trim().toLowerCase()};c.supportContacts=after;
  }else{
   const fields=siteCopyFields.filter(f=>f.section===b.section),validated={};
   for(const f of fields){const value=b.fields?.[f.id];if(!value||typeof value!=='object')fail('Заполните все поля раздела.');validated[f.id]={};for(const lang of ['ru','kk']){const v=value[lang];if(typeof v!=='string'||!v.trim()||v.length>f.max||/[\u0000-\u0008\u000b-\u001f\u007f<>]/.test(v))fail('Проверьте текст «'+f.label+'»: обязательные RU и KK, длина до '+f.max+' символов.');validated[f.id][lang]=v.trim();}}
   const current=siteCopy(s);before=Object.fromEntries(fields.map(f=>[f.id,current[f.id]]));after=validated;c.siteCopy={...current,...validated};
  }
 }else if(b.action==='tariff-save'){
  const p=c.tariffs.find(x=>x.id===b.id);if(!p)fail('Тариф не найден.',404);
  if(!Number.isSafeInteger(b.price)||b.price<1||b.price>10000000)fail('Цена — целое число от 1 до 10 000 000 ₸.');
  if(p.id==='MAX'?b.limit!==null:!Number.isSafeInteger(b.limit)||b.limit<1||b.limit>10000)fail('Лимит Start и Business — от 1 до 10 000 карточек. MAX — без ограничений.');
  const ru=text(b.ru,240),kk=text(b.kk,240),proposed=c.tariffs.map(x=>x.id===p.id?{...x,price:b.price,limit:b.limit,ru,kk}:x);
  if(proposed[0].price>proposed[1].price||proposed[1].price>proposed[2].price||proposed[0].limit>proposed[1].limit)fail('Цена и лимит Business должны быть не ниже Start, а цена MAX — не ниже Business.');
  before={...p};for(const profile of Object.values(s.profiles||{}))captureTariffGrant(profile,s,now);
  Object.assign(p,{price:b.price,limit:b.limit,ru,kk});id=p.id;after={...p};c.tariffRevision++;
 }else if(b.action==='city-add'){
  const name=text(b.name,80);if(!/^[\p{L}][\p{L}\p{M}\s.'’\-]*$/u.test(name))fail('Название города должно содержать буквы, пробелы или дефис.');
  if(c.cities.some(x=>normalize(x.name)===normalize(name)))fail('Город с таким названием уже существует.',409);
  if(c.cities.length>=200)fail('Достигнут лимит 200 городов.');
  const city={id:crypto.randomUUID(),name,active:true,position:Math.max(0,...c.cities.map(x=>x.position))+1};c.cities.push(city);id=city.id;after={...city};
 }else if(b.action==='city-status'){
  const row=c.cities.find(x=>x.id===b.id);if(!row)fail('Город не найден.',404);if(typeof b.active!=='boolean')fail('Укажите видимость города.');
  if(!b.active&&(cityInUse(s,row.name)||c.cities.filter(x=>x.active).length<=1))fail('Нельзя скрыть город с профилями, предложениями или объявлениями, либо последний доступный город.',409);
  id=row.id;before={active:row.active};row.active=b.active;after={active:row.active};
 }else{
  if(!Array.isArray(b.ids)||b.ids.length!==c.cities.length||new Set(b.ids).size!==c.cities.length||b.ids.some(id=>!c.cities.some(x=>x.id===id)))fail('Порядок должен содержать все города без повторов.');
  before=c.cities.slice().sort((a,b)=>a.position-b.position).map(x=>x.id);b.ids.forEach((id,i)=>{c.cities.find(x=>x.id===id).position=i+1});after=[...b.ids];
 }
 c.revision++;c.audit.push({id:crypto.randomUUID(),actorId:u.id,event:b.action,itemId:id,before,after,revision:c.revision,time:now});c.audit=c.audit.slice(-500);
 const result={ok:true,id,revision:c.revision};s.receipts??={};s.receipts[key]={fingerprint:fp,result,time:now};return result;
}
