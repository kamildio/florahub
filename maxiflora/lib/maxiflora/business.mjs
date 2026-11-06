import {availableBaseProducts} from './catalog-directory.mjs';
import {minimumOrder,validateMinimum} from './order-minimum.mjs';
import {DomainError,terminal,event,allocateAll,amount} from './engine.mjs';
import {inventoryAccess,inventoryVersion} from './inventory.mjs';
import {renewStockPublication,startStockPublication} from './offer-publication.mjs';
const fail=(m,status=422)=>{throw new DomainError(m,status)};
export const activePlan=(u,now)=>u?.plan&&u.planUntil>now;
const doneAt=o=>o.completedAt||o.history?.find(h=>h.text?.startsWith('Товар фактически передан.'))?.time;
const readyAt=o=>o.readyAt||o.history?.find(h=>h.text?.startsWith('Готов к выдаче.'))?.time;
function supplierProduct(s,u,id){const p=s.products.find(x=>x.id===id&&x.supplierId===u.id);if(!u.supplier||!p)fail('Предложение недоступно.',403);return p;}
export function supplierRating(s,id){
 const orders=s.orders.filter(o=>o.supplierId===id),reviews=(s.reviews||[]).filter(r=>r.supplierId===id&&!r.hidden&&orders.some(o=>o.id===r.orderId&&o.status==='done'));
 let counted=0,onTime=0,neutral=0;
 for(const o of orders){
  if(o.discipline?.neutral){neutral++;continue;}
  if(!terminal(o)&&o.status!=='overdue')continue;
  if(o.status==='cancelled'&&o.cancelledBy===o.buyerId&&!(o.respondedAt>o.responseBy)){neutral++;continue;}
  counted++;const end=doneAt(o),ready=readyAt(o),first=o.respondedAt??ready;
  if(o.status==='done'&&end&&o.pickupBy&&end<=o.pickupBy&&first&&first<=o.responseBy)onTime++;
 }
 const average=reviews.length?reviews.reduce((n,r)=>n+r.stars,0)/reviews.length:null,discipline=counted?5*onTime/counted:null;
 const rating=average!==null&&discipline!==null?Math.floor((7*average+3*discipline)+0.5)/10:null;
 return {rating,average:average===null?null:Math.round(average*10)/10,discipline:discipline===null?null:Math.round(discipline*10)/10,counted,onTime,neutral,reviews:reviews.length};
}
export function publicSuppliers(s){return Object.values(s.profiles).filter(u=>u.supplier&&u.approved===true&&u.complete===true&&typeof u.name==='string'&&u.name.trim()).map(u=>({id:u.id,name:u.name,city:u.city,address:u.address,approved:u.approved,...supplierRating(s,u.id),reviews:(s.reviews||[]).filter(r=>r.supplierId===u.id&&!r.hidden&&s.orders.some(o=>o.id===r.orderId&&o.status==='done')).map(r=>({id:r.id,stars:r.stars,text:r.text,created:r.created,moderated:!!r.moderated})),timelyOrders:s.orders.filter(o=>o.supplierId===u.id&&o.status==='done'&&doneAt(o)<=o.pickupBy&&(o.respondedAt??readyAt(o))<=o.responseBy&&!o.discipline?.neutral).map(o=>({reference:o.id,completed:doneAt(o)}))}));}
export function reports(s,u,from,to,now=Date.now()){
 inventoryAccess(u,now);const start=Date.parse(from+'T00:00:00+05:00'),end=Date.parse(to+'T00:00:00+05:00')+86400000;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(from||'')||!/^\d{4}-\d{2}-\d{2}$/.test(to||'')||!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>367*86400000)fail('Выберите период не более одного года.');
 const all=s.orders.filter(o=>o.supplierId===u.id),created=all.filter(o=>o.created>=start&&o.created<end),issued=all.filter(o=>o.status==='done'&&doneAt(o)>=start&&doneAt(o)<end);
 const companies=[...new Set([...created,...issued].map(o=>o.buyerId))].map(id=>{const own=created.filter(o=>o.buyerId===id),out=issued.filter(o=>o.buyerId===id);return {id,name:[...own,...out][0].buyer,created:own.length,done:own.filter(o=>o.status==='done').length,cancelled:own.filter(o=>['cancelled','unconfirmed'].includes(o.status)).length,issued:out.length,value:out.reduce((n,o)=>n+amount(o),0)};});
 const goods=new Map();for(const o of issued)for(const x of o.items){const key=x.pid+'|'+x.pack;const row=goods.get(key)||{id:x.pid,name:x.name,pack:x.pack,qty:0,value:0};row.qty+=x.qty;row.value+=x.qty/x.pack*x.price;goods.set(key,row);}
 return {from,to,asOf:now,companies,goods:[...goods.values()],orders:created.map(o=>({id:o.id,buyer:o.buyer,created:o.created,status:o.status,value:amount(o),completed:doneAt(o)||null})),created:created.length,issued:issued.length,issuedValue:issued.reduce((n,o)=>n+amount(o),0)};
}
export function businessView(s,u){return {baseProducts:availableBaseProducts(s),suppliers:publicSuppliers(s),ownReviews:u?(s.reviews||[]).filter(r=>r.buyerId===u.id):[],cases:u?(s.supportCases||[]).filter(c=>c.participants.includes(u.id)).map(c=>({...c,messages:c.messages.filter(m=>m.visibility==='shared'||m.by===u.id)})):[]};}
export async function businessAction(s,u,b,now=Date.now()){
 if(b.action==='offer-renew'){const p=supplierProduct(s,u,b.id);if(await inventoryVersion(p)!==b.version)fail('Остаток, цена или публикация изменились. Обновите экран и проверьте данные.',409);return renewStockPublication(s,u,p,b.publicationDays===undefined?7:b.publicationDays,b.confirmFresh,now);}
 if(b.action==='offer-update'){
  const p=supplierProduct(s,u,b.id);if(await inventoryVersion(p)!==b.version)fail('Предложение изменилось. Откройте актуальные данные.',409);
  if(!Number.isSafeInteger(b.price)||b.price<1||b.price>1000000000||!Number.isSafeInteger(b.pack)||b.pack<1||b.pack>1000000)fail('Проверьте цену упаковки и фасовку.');
  if(b.pack!==p.pack&&p.reserved>0)fail('Фасовку нельзя менять, пока есть действующие резервы.');
  if(p.category==='Растения'&&b.pack!==1)fail('Растения продаются поштучно.');
  if(b.name!==p.name)fail('Название товара задаётся справочником. Условия предложения меняются отдельно.');
  const minOrderQty=validateMinimum(b.minOrderQty===undefined?(p.minOrderQty===undefined?b.pack:minimumOrder(p)):b.minOrderQty,b.pack);
  p.versions??=[];p.versions.push({time:now,by:u.id,name:p.name,price:p.price,pack:p.pack,minOrderQty:minimumOrder(p)});Object.assign(p,{name:b.name.trim(),price:b.price,pack:b.pack,minOrderQty,updatedAt:now});return {ok:true};
 }
 if(b.action==='shortage'||b.action==='batch-close'){
  const p=supplierProduct(s,u,b.id);if(await inventoryVersion(p)!==b.version)fail('Остаток или резерв изменились. Обновите экран.',409);
  if(b.action==='batch-close'){
   if(!p.transit)fail('Поставка уже завершена.',409);
   if(typeof b.reason!=='string'||!b.reason.trim())fail('Укажите основание завершения поставки.');
   p.total=p.received;p.transit=false;p.batchSourceId=p.id;p.closedAt=now;if(p.published&&p.total>0)startStockPublication(p,p.publicationDays||7,now);else if(p.total===0)p.published=false;
  }else{
   if(p.transit)fail('Сначала завершите ожидаемую поставку: нехватка отличается от ещё ожидаемого товара.');
   if(!Number.isSafeInteger(b.factual)||b.factual<0||b.factual>p.total||typeof b.reason!=='string'||!b.reason.trim())fail('Укажите проверенный физический остаток и причину.');
   const delta=b.factual-p.total;p.total=b.factual;
   s.movements.unshift({id:crypto.randomUUID(),pid:p.id,name:p.name,supplierId:u.id,actor:u.id,source:'shortage',operationId:b.operationId,kind:'count',qty:delta,reason:b.reason.trim().slice(0,500),time:now});
  }
  if(p.reserved>p.total)p.holdSales={since:now,reason:b.reason.trim().slice(0,500),by:u.id};
  allocateAll(s,now);
  const impacted=s.orders.filter(o=>!terminal(o)&&o.items.some(x=>x.pid===p.id&&(x.allocated||0)<x.qty));
  for(const o of impacted)event(s,o,'Подтверждена физическая нехватка по '+p.name+'. Нужны согласование состава или отмена. Прежние условия и резерв сохраняются до решения.',now);
  return {ok:true,impacted:impacted.map(o=>o.id),deficit:Math.max(0,p.reserved-p.total)};
 }
 if(b.action==='review'){
  const o=s.orders.find(o=>o.id===b.id&&o.buyerId===u.id);if(!o)fail('Заказ недоступен.',403);
  const end=doneAt(o);if(o.status!=='done'||!end||now>=end+30*86400000)fail('Отзыв доступен в течение 30 дней после фактического исполнения.');
  s.reviews??=[];if(s.reviews.some(r=>r.orderId===o.id))fail('Отзыв по этому заказу уже опубликован. Самостоятельное редактирование недоступно.',409);
  if(!Number.isInteger(b.stars)||b.stars<1||b.stars>5||typeof b.text!=='string'||b.text.length>2000||b.confirmed!==true)fail('Выберите от 1 до 5 звёзд и подтвердите публикацию.');
  const review={id:crypto.randomUUID(),orderId:o.id,buyerId:u.id,supplierId:o.supplierId,stars:b.stars,text:b.text.trim(),created:now};s.reviews.unshift(review);return {id:review.id};
 }
 if(b.action==='case-open'||b.action==='case-message'){
  s.supportCases??=[];
  let record;
  if(b.action==='case-open'){
   const o=s.orders.find(o=>o.id===b.orderId&&[o.buyerId,o.supplierId].includes(u.id));if(!o)fail('Заказ недоступен.',403);
   record=s.supportCases.find(c=>c.orderId===o.id&&!['closed','resolved'].includes(c.status));
   if(!record){record={id:crypto.randomUUID(),number:s.next++,orderId:o.id,participants:[o.buyerId,o.supplierId],created:now,status:'new',messages:[],history:[{time:now,text:'Обращение зарегистрировано'}]};s.supportCases.unshift(record);}
  }else record=s.supportCases.find(c=>c.id===b.id&&c.participants.includes(u.id));
  if(!record)fail('Обращение недоступно.',403);if(['closed','resolved'].includes(record.status))fail('Обращение завершено. Откройте новое, если вопрос не решён.');
  if(typeof b.text!=='string'||!b.text.trim()||b.text.length>4000)fail('Опишите вопрос: от 1 до 4000 символов.');
  if(!['shared','private'].includes(b.visibility))fail('Выберите видимость сообщения.');
  record.messages.push({id:crypto.randomUUID(),by:u.id,text:b.text.trim(),visibility:b.visibility,time:now});record.updated=now;
  return {id:record.id,number:record.number};
 }
 fail('Неизвестное действие.');
}
