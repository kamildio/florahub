import {observeOrderMail} from './order-mail.mjs';
import {activeCities} from './cities.mjs';
import {catalogEntryEnabled,availableBaseProducts,categoryLabels} from './catalog-directory.mjs';
import {companyTypes,normalizedEmail,validEmail,supplierIssues,buyerIssues,companyApproved} from './company-profile.mjs';
import {PRIVACY_VERSION} from './privacy-policy.mjs';
import {minimumOrder,validateMinimum} from './order-minimum.mjs';
import {activeOfferLimit} from './launch-policy.mjs';
import {recordMessage} from './message-sequence.mjs';
import {activateDueSubscriptions} from './manual-payments.mjs';
import {trialReminders} from './subscriptions.mjs';
import {publicationDays,stockPublicationActive,startStockPublication,renewStockPublication,expireStockPublications} from './offer-publication.mjs';
// Pure domain operations. The caller commits the whole operation with a revision compare-and-swap.
export class DomainError extends Error { constructor(message, status=422) { super(message); this.status=status; } }
const fail=(message,status=422)=>{throw new DomainError(message,status)};
export const terminal=o=>['done','cancelled','unconfirmed'].includes(o.status);
export const money=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n)+' ₸';
export const free=p=>p.holdSales?0:Math.max(0,Math.floor((p.total-p.reserved)/p.pack)*p.pack);
export const amount=o=>o.items.reduce((s,x)=>s+x.qty/x.pack*x.price,0);
export function responseDeadline(now) {
  const d=new Date(now+5*3600000), h=d.getUTCHours();
  if(h>=9&&h<20)return now+3600000;
  if(h>=20)d.setUTCDate(d.getUTCDate()+1);
  d.setUTCHours(10,0,0,0);return d.getTime()-5*3600000;
}
const demoBuyer={id:'demo-buyer',companyType:'IP',name:'Цветочная «Лепесток»',contact:'Демо покупатель',city:'Шымкент',phone:'+77000000001',email:'buyer@example.test',verified:true,complete:true,supplier:false,companyApproved:true,companyStatus:'approved'};
const demoSupplier={id:'demo-supplier',companyType:'TOO',name:'Flora Market',contact:'Демо поставщик',city:'Шымкент',phone:'+77000000002',email:'supplier@example.test',verified:true,complete:true,supplier:true,approved:true,plan:'MAX',planUntil:4102444800000,address:'Шымкент · тестовый склад',bin:'Тестовые данные'};
export const demoProfiles={buyer:demoBuyer,supplier:demoSupplier};
export function seed(now=Date.now()) {
 const rows=[
 ['Роза Explorer','Розы','Эквадор',60,25,7000,1030,'#a32642','rose'],
 ['Роза Mondial','Розы','Эквадор',70,25,8250,500,'#e7d4ad','rose'],
 ['Тюльпан Royal Virgin','Тюльпаны','Нидерланды',40,20,4800,320,'#f6f0de','tulip'],
 ['Гортензия Blue','Гортензии','Нидерланды',60,5,14500,90,'#9baddb','hydrangea'],
 ['Роза Pink O’Hara','Розы','Кения',50,20,6800,400,'#dfa4b0','rose'],
 ['Эвкалипт Cinerea','Зелень','Италия',60,10,4500,180,'#80a28b','green'],
 ['Хризантема Bacardi','Хризантемы','Нидерланды',70,10,3900,300,'#eee6bb','daisy'],
 ['Монстера Deliciosa','Растения','Нидерланды',80,1,12500,24,'#467349','plant'],
 ['Роза Freedom','Розы','Эквадор',60,25,6500,500,'#bc354c','rose']
 ];
 const products=rows.map((r,i)=>({createdAt:now,ledgerStart:now,ledgerOpening:i===8?0:r[6],baseId:'flora-'+(i+1),id:i+1,name:r[0],category:r[1],origin:r[2],height:r[3],pack:r[4],price:r[5],total:r[6],color:r[7],kind:r[8],reserved:0,supplierId:'demo-supplier',supplier:'Flora Market',city:'Шымкент',address:demoSupplier.address,published:true,transit:i===8,received:0,arrival:new Date(now+3*86400000).toISOString().slice(0,10)}));
 for(const p of products){p.publicationDays=7;if(!p.transit)startStockPublication(p,7,now);}
 return {baseProducts:products.map(p=>Object.fromEntries(['baseId','name','category','origin','height','kind','color'].map(k=>[k==='baseId'?'id':k,p[k]]))),inventorySince:now,products,orders:[],movements:[],notifications:[],messages:[],receipts:{},profiles:{'demo-buyer':{...demoBuyer},'demo-supplier':{...demoSupplier}},next:1001};
}
export const blank=()=>({baseProducts:seed().baseProducts,products:[],orders:[],movements:[],notifications:[],messages:[],receipts:{},profiles:{},next:1001});
export function event(s,o,text,now){if(o.status==='done')o.completedAt??=now;if(o.status==='ready')o.readyAt??=now;o.version=(o.version||0)+1;o.history.push({time:now,text});observeOrderMail(s,o,now);s.notifications.unshift({id:crypto.randomUUID(),users:[o.buyerId,o.supplierId],orderId:o.id,text,time:now});}
export function release(s,o,now=Date.now()){for(const x of o.items){const p=s.products.find(p=>p.id===x.pid);p.reserved-=x.qty;if(p.reserved<0)fail('Ошибка резерва. Требуется сверка.',500);}o.proposal=null;allocateAll(s,now);}
export function allocateAll(s,now=Date.now()){
 const allocate=p=>{let available=p.transit?p.received:p.total;for(const o of s.orders.filter(o=>!terminal(o)).sort((a,b)=>a.created-b.created||a.id-b.id)){for(const x of o.items.filter(x=>x.pid===p.id)){x.allocated=Math.min(x.qty,Math.max(0,available));available-=x.allocated;}}if(p.holdSales&&p.reserved<=(p.transit?p.received:p.total))delete p.holdSales;};
 for(const p of s.products)allocate(p);
 for(const p of [...s.products].filter(p=>p.transit)){
  const physicalFree=Math.max(0,p.received-p.reserved);if(!physicalFree)continue;
  let stock=s.products.find(x=>x.id===p.stockPartId);
  if(!stock){stock={...p,id:s.next++,total:0,reserved:0,received:0,transit:false,physicalPartOf:p.id,batchSourceId:p.id,createdAt:now,ledgerStart:now,ledgerOpening:0,publicationHistory:[],publicationRevision:0};delete stock.stockPartId;delete stock.holdSales;delete stock.publicationStartedAt;delete stock.publicationUntil;delete stock.publicationExpiredAt;const owner=s.profiles[p.supplierId],limit=activeOfferLimit(owner?.plan,s,owner);stock.published=!!p.published&&checkSupplier(stock,s,now)&&s.products.filter(x=>x.supplierId===p.supplierId&&x.published&&stockPublicationActive(x,now)).length<limit;if(stock.published)startStockPublication(stock,stock.publicationDays||7,now);s.products.push(stock);p.stockPartId=stock.id;}
  p.received-=physicalFree;p.total-=physicalFree;stock.total+=physicalFree;
  const transferId=crypto.randomUUID();
  for(const [target,qty,kind] of [[p,-physicalFree,'transfer-out'],[stock,physicalFree,'transfer-in']])s.movements.unshift({id:crypto.randomUUID(),transferId,batchId:p.id,pid:target.id,name:target.name,supplierId:p.supplierId,actor:'system',source:'batch-transfer',kind,qty,reason:'Перенос фактически поступившей части партии № '+p.id,time:now});
  allocate(stock);
 }
 for(const p of s.products.filter(p=>p.transit&&p.received===p.total)){p.batchSourceId=p.id;p.closedAt=now;p.transit=false;if(p.total===0&&!p.reserved)p.published=false;else if(p.published)startStockPublication(p,p.publicationDays||7,now);}
}

function reminders(s,now){
 let changed=false;
 for(const o of s.orders){
  if(terminal(o))continue;o.reminders??={};
  const send=(key,when,text,users)=>{if(o.reminders[key]||now<when)return;o.reminders[key]=now;s.notifications.unshift({id:crypto.randomUUID(),users,orderId:o.id,text,time:now,reminder:true});changed=true;};
  if(o.status==='new'&&!o.proposal&&now<o.responseBy)send('response:'+o.responseBy,o.responseBy-900000,'Заказ № '+o.id+': осталось менее 15 минут на первый ответ.',[o.supplierId]);
  if(o.status==='ready'&&now<o.pickupBy)send('pickup:'+o.pickupBy,o.pickupBy-3600000,'Заказ № '+o.id+': менее часа до окончания срока получения.',[o.buyerId,o.supplierId]);
  if(o.cancelRequest){for(const hours of [2,8])send('cancel:'+hours,o.cancelRequest.time+hours*3600000,'Заказ № '+o.id+': покупатель ожидает подтверждения отмены '+hours+' ч.',[o.supplierId]);}
  if(o.transit&&o.arrival){const arrival=Date.parse(o.arrival+'T00:00:00+05:00');if(now<arrival)send('arrival:'+o.arrival,arrival-86400000,'Завтра ожидается поступление по предзаказу № '+o.id+'. Готовность подтвердит поставщик.',[o.buyerId]);}
 }
 return changed;
}
export function processTimers(s,now){let changed=activateDueSubscriptions(s,now);
 // The original registration stored the accepted personal name as the company.
 // Repair only untouched, unapproved profiles with that exact consent evidence.
 for(const p of Object.values(s.profiles||{}))if(!p.approved&&!p.companyType&&!p.contact&&typeof p.name==='string'&&p.name&&p.name===p.consent?.name){p.contact=p.name;p.name='';p.complete=false;p.profileVersion=(p.profileVersion||0)+1;if(p.supplier)p.supplierStatus='draft';changed=true;}
 changed=expireStockPublications(s,now)||changed;changed=trialReminders(s,now)||changed;changed=reminders(s,now)||changed;for(const o of s.orders){if(terminal(o))continue;
 if(o.proposal&&now>=o.proposal.deadline&&!o.proposal.timedOut){if(o.proposal.recipient==='buyer'){o.status='cancelled';release(s,o,now);event(s,o,'Нет ответа покупателя. Заказ отменён; резерв освобождён.',now);}else{o.proposal.overdue=true;if(!o.proposal.timedOut){o.proposal.timedOut=true;event(s,o,'Просрочен ответ поставщика. Заказ и резерв сохранены.',now);}}changed=true;}
 if(!o.proposal&&o.status==='new'&&now>=o.responseBy){o.status='unconfirmed';release(s,o,now);event(s,o,'Поставщик не подтвердил заказ в срок. Резерв освобождён.',now);changed=true;}
 if(o.status==='ready'&&now>=o.pickupBy){o.status='overdue';event(s,o,'Истекли 24 часа на получение. Резерв сохранён.',now);changed=true;}
 }return changed;}
function checkSupplier(p,s,now){const u=s.profiles[p.supplierId];return companyTypes.includes(u?.companyType)&&u?.complete&&u?.approved&&u.plan&&u.planUntil>now&&(!p.transit||u.plan==='MAX');}
export function apply(s,u,body,now=Date.now()){
 const kind=body.action;
 if(kind==='supplier-enable'){
  if(u.supplier)return {ok:true};
  if(!companyTypes.includes(u.companyType)||!u.complete||!u.city||!u.name)fail('Сначала заполните профиль компании и город.');
  u.supplier=true;u.approved=false;u.supplierStatus='draft';u.profileVersion=(u.profileVersion||0)+1;u.plan=u.launchTrial?.plan||null;u.supplierEnabledAt=now;return {ok:true};
 }
 if(kind==='notifications-read'){
  for(const n of s.notifications.filter(n=>n.users.includes(u.id))){n.readBy??=[];if(!n.readBy.includes(u.id))n.readBy.push(u.id);}return {ok:true};
 }
 if(kind==='checkout'){
  if(!companyApproved(u))fail('Отправьте профиль ИП или ТОО на проверку. Оформление заказов откроется после одобрения компании.',403);
  if(!(u.verified===true||(u.phoneVerified===true&&['telegram-gateway','whatsapp-cloud'].includes(u.phoneVerificationMethod)))||!u.complete)fail('Для оформления заполните профиль и подтвердите телефон.',403);
  if(!Array.isArray(body.items)||!body.items.length||body.items.length>96)fail('Проверьте состав корзины.');
  const results=[],groups=new Map();
  for(const row of body.items){const p=s.products.find(p=>p.id===row.pid);let reason=!p||!p.published?'Предложение снято с публикации':!catalogEntryEnabled(s,p)?'Товар или категория скрыты администратором':!stockPublicationActive(p,now)?'Срок публикации предложения истёк. Дождитесь обновления поставщиком':p.holdSales?'Предложение на сверке физической нехватки':p.supplierId===u.id?'Заказ у своего профиля запрещён':!checkSupplier(p,s,now)?'Новые продажи поставщика недоступны':p.transit&&p.arrival<new Date(now+5*3600000).toISOString().slice(0,10)?'Дата поступления прошла':!Number.isSafeInteger(row.qty)||row.qty<=0||row.qty%p.pack?'Количество должно быть кратно фасовке':row.qty<minimumOrder(p)?'Минимальный заказ по карточке — '+minimumOrder(p)+' шт.':row.price!==p.price?'Цена изменилась. Примите новые условия':row.pack!==p.pack?'Фасовка изменилась. Выберите количество заново':!Number.isSafeInteger(row.qty/p.pack*p.price)?'Сумма строки слишком велика':row.qty>free(p)?'Недостаточное количество':'';
   if(reason){results.push({pid:row.pid,error:reason,available:p?free(p):0,price:p?.price,pack:p?.pack,minOrderQty:p?minimumOrder(p):undefined});continue;}
   p.reserved+=row.qty;
   // Availability orders are independent by supplier; preorders additionally by batch.
   const key=p.supplierId+'|'+(p.transit?'batch-'+p.id:'stock');
   if(!groups.has(key))groups.set(key,[]);if(!Number.isSafeInteger(amount({items:groups.get(key)})+row.qty/p.pack*p.price)){p.reserved-=row.qty;results.push({pid:p.id,error:'Общая сумма заказа слишком велика'});continue;}groups.get(key).push({pid:p.id,name:p.name,qty:row.qty,pack:p.pack,minOrderQty:minimumOrder(p),price:p.price,allocated:p.transit?0:row.qty});
  }
  for(const items of groups.values()){const p=s.products.find(p=>p.id===items[0].pid),o={id:s.next++,buyerId:u.id,buyer:u.name,supplierId:p.supplierId,supplier:p.supplier,city:p.city,address:p.address,items,created:now,responseBy:responseDeadline(now),status:'new',transit:p.transit,arrival:p.transit?p.arrival:null,version:0,history:[],termsVersion:'v64-test-2026-10-20',proposal:null,cancelRequest:null};s.orders.unshift(o);event(s,o,'Заказ создан. Товар зарезервирован; оплата напрямую поставщику.',now);for(const item of items)results.push({pid:item.pid,orderId:o.id});}
  allocateAll(s,now);return {results};
 }
 if(kind==='profile'){
  if(typeof body.bank==='string')body={...body,bank:body.bank.replace(/\s/g,'').toUpperCase()};
  const fields=['companyType','name','contact','city','email','address','bin','legalAddress','bank'];const p=s.profiles[u.id]||{...u};
  if(body.city!==undefined&&p.supplier&&p.city&&body.city!==p.city)fail('Город поставщика закреплён.');
  if(body.profileVersion!==undefined&&body.profileVersion!==(p.profileVersion||0))fail('Профиль изменился. Обновите данные.',409);
  if((p.supplier&&body.saveDraft!==true)||body.submitForReview===true){
   const candidate={...p};
   for(const k of fields)if(typeof body[k]==='string')candidate[k]=body[k].trim();
   const issues=(p.supplier?supplierIssues:buyerIssues)(candidate,s);
   if(issues.length)fail(issues.join(' '));
  }
  const changed=fields.some(k=>typeof body[k]==='string'&&body[k].trim()!==(p[k]||''));
  if(body.companyType!==undefined&&!companyTypes.includes(body.companyType))fail('Выберите ИП или ТОО.');
  if(body.city!==undefined&&!activeCities(s).includes(body.city))fail('Выберите город профиля из списка.');
  if(body.email!==undefined&&!validEmail(normalizedEmail(body.email)))fail('Укажите корректный email.');
  for(const k of fields)if(typeof body[k]==='string'){
   if(body[k].length>250)fail('Поле слишком длинное.');
   if(k==='city'&&p.supplier&&p.city&&body[k]!==p.city)fail('Город поставщика закреплён.');
   if(k==='email'&&body[k]!==p.email)p.verified=false;
   if(['companyType','name','bin','legalAddress'].includes(k)&&body[k]!==p[k]){p.approved=false;p.companyApproved=false;p.companyStatus='draft';p.companyReview=null;}
   if(k==='bank'&&p.approved&&body[k]!==p.bank){p.pendingBank=body[k];continue;}p[k]=body[k].trim();
  }
  if(changed){p.profileVersion=(p.profileVersion||0)+1;if(p.supplier&&!p.approved){p.supplierStatus='draft';p.supplierReview=null;}if(!p.supplier&&!p.companyApproved){p.companyStatus='draft';p.companyReview=null;}}
  p.complete=!!(companyTypes.includes(p.companyType)&&p.name&&p.contact&&p.city&&p.phone&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email||''))&&(!p.supplier||supplierIssues(p,s).length===0);
  s.profiles[u.id]=p;if(p.supplier)for(const offer of s.products.filter(x=>x.supplierId===u.id)){offer.supplier=p.name;offer.address=p.address||'';offer.city=p.city;}return {profile:p};
 }
 if(kind==='message'){
  const o=s.orders.find(o=>o.id===body.id);if(!o||![o.buyerId,o.supplierId].includes(u.id))fail('Заказ недоступен.',403);
  if(typeof body.text!=='string'||!body.text.trim()||body.text.length>2000)fail('Введите сообщение до 2000 символов.');
  const m={id:crypto.randomUUID(),orderId:o.id,from:u.id,to:u.id===o.buyerId?o.supplierId:o.buyerId,text:body.text.trim(),time:now};recordMessage(s,m,m.to,'order:'+o.id);s.messages.push(m);return {message:m};
 }
 if(['receive','outside','count','publish','offer'].includes(kind)){
  if(!u.supplier)fail('Нужен профиль поставщика.',403);
  let p=s.products.find(p=>p.id===body.id);
  if(kind==='offer'){
   const d=body.product;const base=s.baseProducts?.find(x=>x.id===d?.baseId);if(!base||!availableBaseProducts(s).some(x=>x.id===base.id))fail('Выберите доступный товар из справочника.');if(!d||!d.name?.trim()||d.name.length>120||!Number.isSafeInteger(d.pack)||d.pack<1||!Number.isSafeInteger(d.price)||d.price<1||!Number.isSafeInteger(d.total)||d.total<0)fail('Проверьте название, фасовку, цену и остаток.');
   if(base.category==='Растения'&&d.pack!==1)fail('Комнатные растения продаются поштучно. Укажите фасовку 1.');
   if(d.transit&&(!/^\d{4}-\d{2}-\d{2}$/.test(d.arrival||'')||d.arrival<new Date(now+5*3600000).toISOString().slice(0,10)))fail('Укажите действующую дату поступления партии.');
   if(d.transit&&u.plan!=='MAX')fail('Новые партии в пути доступны с MAX.',403);
   const days=publicationDays(d.publicationDays);
   p={createdAt:now,ledgerStart:now,ledgerOpening:0,id:s.next++,baseId:base.id,name:base.name,category:base.category,origin:base.origin,height:base.height,pack:d.pack,minOrderQty:validateMinimum(d.minOrderQty,d.pack),price:d.price,total:d.total,reserved:0,received:0,supplierId:u.id,supplier:u.name,city:u.city,address:u.address||'',published:false,publicationDays:days,transit:!!d.transit,arrival:d.arrival||null,kind:base.kind,color:base.color};s.products.push(p);if(!p.transit&&p.total)s.movements.unshift({id:crypto.randomUUID(),pid:p.id,name:p.name,supplierId:u.id,actor:u.id,source:'initial',kind:'count',qty:p.total,reason:'Начальный ввод остатка',time:now});return {id:p.id};
  }
  if(!p||p.supplierId!==u.id)fail('Предложение недоступно.',403);
  if(kind==='publish'){
   if(!p.published&&!catalogEntryEnabled(s,p))fail('Товар или категория скрыты администратором.',403);
   if(!p.transit){if(!p.published)return renewStockPublication(s,u,p,body.publicationDays===undefined?(p.publicationDays??7):body.publicationDays,body.confirmFresh,now);p.published=false;p.publicationRevision=(p.publicationRevision||0)+1;p.publicationHistory??=[];p.publicationHistory.push({event:'withdrawn',time:now,by:u.id});return {published:false};}
   if(!p.published){if(!checkSupplier(p,s,now))fail('Публикация требует одобренного профиля и активного тарифа.',403);const limit=activeOfferLimit(u.plan,s,u);if(s.products.filter(p=>p.supplierId===u.id&&p.published&&stockPublicationActive(p,now)).length>=limit)fail('Достигнут лимит предложений тарифа.');}p.published=!p.published;return {published:p.published};
  }
  if(!Number.isSafeInteger(body.qty)||body.qty<(kind==='count'?0:1))fail('Введите целое количество в штуках.');
  if(!body.reason?.trim()&&kind!=='receive')fail('Укажите причину операции.');
  let delta;
  if(kind==='receive'){
   if(body.qty%p.pack)fail('Приёмка — полными упаковками по '+p.pack+' шт.');
   if(!Number.isSafeInteger((p.transit?p.received:p.total)+body.qty))fail('Слишком большое количество.');
   if(p.transit){if(body.qty>p.total-p.received)fail('Количество превышает ожидаемый остаток партии.');p.received+=body.qty;allocateAll(s,now);if(p.received===p.total){p.batchSourceId=p.id;p.closedAt=now;p.transit=false;if(p.total===0&&!p.reserved)p.published=false;}}else p.total+=body.qty;delta=body.qty;
  }else{
   if(p.transit)fail('Для партии в пути используйте приёмку.');
   const total=kind==='outside'?p.total-body.qty:body.qty;if(total<p.reserved)fail('Остаток ниже резерва. Сначала согласуйте уменьшение затронутых заказов.');delta=total-p.total;p.total=total;
  }
  allocateAll(s,now);s.movements.unshift({id:crypto.randomUUID(),pid:p.id,name:p.name,supplierId:u.id,actor:u.id,source:body.operationId||'manual',kind,qty:delta,reason:body.reason||'Приёмка',time:now});return {total:p.total,received:p.received};
 }
 const o=s.orders.find(o=>o.id===body.id);if(!o||![o.buyerId,o.supplierId].includes(u.id))fail('Заказ недоступен.',403);
 if(body.version!==o.version)fail('Заказ изменился. Обновите карточку и повторите действие.',409);
 if(terminal(o))fail('Заказ уже завершён.',409);
 const supplier=u.id===o.supplierId,buyer=u.id===o.buyerId;
 if(kind==='request-cancel'){
  if(!buyer)fail('Действие доступно покупателю.',403);if(!body.reason?.trim())fail('Укажите причину отмены.');
  if(o.cancelRequest)return {id:o.id};o.cancelRequest={reason:body.reason.trim().slice(0,500),time:now};event(s,o,'Покупатель просит отмену: '+o.cancelRequest.reason+'. Резерв и сроки сохраняются.',now);return {id:o.id};
 }
 if(kind==='cancel'){
  if(!supplier)fail('Отмену подтверждает поставщик.',403);if(!body.reason?.trim())fail('Укажите основание отмены.');
  o.cancelledBy=o.cancelRequest?o.buyerId:u.id;o.status='cancelled';release(s,o,now);event(s,o,(o.cancelRequest?'Клиент отменил заказ. ':'Поставщик отклонил заказ. ')+body.reason.trim().slice(0,500)+'. Резерв освобождён.',now);return {id:o.id};
 }
 if(kind==='propose'){
  if(o.cancelRequest)fail('Сначала разрешите просьбу об отмене.');
  if(!Array.isArray(body.items)||body.items.length!==o.items.length)fail('Проверьте состав предложения.');
  const items=body.items.map((r,i)=>{const x=o.items[i];if(r.pid!==x.pid||!Number.isSafeInteger(r.qty)||r.qty<0||r.qty>x.qty||r.qty%x.pack||!Number.isSafeInteger(r.price)||r.price<=0||(!supplier&&r.price!==x.price))fail('Количество должно быть кратно сохранённой фасовке и не больше заказанного. Цену предлагает поставщик.');return {...x,qty:r.qty,price:r.price};});
  if(supplier&&!o.transit&&body.assembled&&items.some((r,i)=>r.qty>(o.items[i].allocated??o.items[i].qty)))fail('Предлагаемый состав не обеспечен физическим товаром.');
  if(supplier&&!o.transit&&!body.assembled)fail('Подтвердите сборку предложенного состава.');
  if(!items.some(x=>x.qty>0))fail('Пустой состав оформляется отменой заказа.');if(!Number.isSafeInteger(amount({items})))fail('Сумма изменения слишком велика.');
  const terms=Object.fromEntries(['arrival','pickupBy','address'].filter(k=>o.proposal?.[k]!==undefined).map(k=>[k,o.proposal[k]]));for(const key of ['arrival','pickupBy','address']){if(body[key]===undefined)continue;if(!supplier&&body[key]!==o.proposal?.[key])fail('Дату, срок и адрес предлагает поставщик.',403);if(key==='arrival'){if(!o.transit||!/^\d{4}-\d{2}-\d{2}$/.test(body[key])||!Number.isFinite(Date.parse(body[key]+'T00:00:00+05:00'))||new Date(body[key]+'T12:00:00Z').toISOString().slice(0,10)!==body[key]||body[key]<new Date(now+5*3600000).toISOString().slice(0,10))fail('Укажите действующую дату предзаказа.');}else if(key==='pickupBy'){if(!['ready','overdue'].includes(o.status)||!Number.isSafeInteger(body[key])||body[key]<=now)fail('Новый срок получения должен быть в будущем для готового заказа.');}else if(typeof body[key]!=='string'||!body[key].trim()||body[key].length>250)fail('Укажите адрес получения внутри города поставщика.');terms[key]=body[key];}
  if(supplier)o.respondedAt??=now;
  const previous=o.proposal; o.proposal={...terms,items,by:u.id,recipient:supplier?'buyer':'supplier',deadline:previous?.deadline||responseDeadline(now),assembled:supplier&&!!body.assembled,overdue:previous?.overdue||false};
  if(!previous){o.pausedRemaining=Math.max(0,Math.min(3600000,o.responseBy-now));o.nightResponse=o.responseBy>now+3600000;}
  event(s,o,'Предложены изменения. Ожидается ответ '+(supplier?'покупателя':'поставщика')+'. Сумма: '+money(amount({items})),now);return {id:o.id};
 }
 if(kind==='agree'||kind==='reject'){
  const q=o.proposal;if(!q)fail('Нет открытого предложения.');if((q.recipient==='supplier')!==supplier)fail('Ожидается ответ другой стороны.',403);
  if(kind==='reject'){
   if(buyer){o.status='cancelled';release(s,o,now);event(s,o,'Покупатель отказался от изменения. Заказ отменён; резерв освобождён.',now);}else{o.proposal=null;o.responseBy=o.nightResponse?Math.max(o.responseBy,now):now+o.pausedRemaining;event(s,o,'Поставщик отклонил встречное предложение. Прежний состав сохранён.',now);}return {id:o.id};
  }
  if(q.assembled&&!o.transit&&q.items.some((r,i)=>r.qty>(o.items[i].allocated??o.items[i].qty)))fail('Состав больше не обеспечен физическим товаром. Поставщику нужно обновить предложение.');
  for(let i=0;i<o.items.length;i++){const x=o.items[i],r=q.items[i],p=s.products.find(p=>p.id===x.pid);p.reserved-=x.qty-r.qty;}
  o.termsHistory??=[];o.termsHistory.push({time:now,by:q.by,acceptedBy:u.id,before:{items:o.items,arrival:o.arrival,pickupBy:o.pickupBy,address:o.address},after:{items:q.items,arrival:q.arrival??o.arrival,pickupBy:q.pickupBy??o.pickupBy,address:q.address??o.address}});
  for(const key of ['arrival','pickupBy','address'])if(q[key]!==undefined)o[key]=q[key];
  o.items=q.items.filter(x=>x.qty>0).map(x=>({...x}));o.proposal=null;allocateAll(s,now);
  if(buyer&&q.assembled&&!o.transit&&!['ready','overdue'].includes(o.status)){o.status='ready';o.contactsReleasedAt??=now;o.pickupBy=now+86400000;}
  if(q.pickupBy!==undefined&&o.status==='overdue')o.status='ready';
  if(o.status==='new')o.responseBy=o.nightResponse?Math.max(o.responseBy,now):now+o.pausedRemaining;
  event(s,o,'Изменение согласовано. Резерв обновлён.'+(o.status==='ready'?' Заказ готов к выдаче.':''),now);return {id:o.id};
 }
 if(!supplier)fail('Действие доступно поставщику.',403);
 if(o.cancelRequest)fail('Покупатель просит отмену. Подтвердите отмену.');
 if(o.proposal)fail('Сначала завершите согласование.');
 if(kind==='accept'){
  if(!o.transit||o.status!=='new')fail('Принять можно новый предзаказ.');o.respondedAt??=now;o.status='accepted';o.contactsReleasedAt??=now;event(s,o,'Предзаказ принят. Ожидается поступление партии.',now);
 }else if(kind==='ready'){
  if(o.transit&&o.status==='new')fail('Сначала примите предзаказ.');
  if(!['new','accepted'].includes(o.status))fail('Готовность уже подтверждена либо недоступна.');
  if(o.items.some(x=>(x.allocated??x.qty)<x.qty))fail('Товар поступил не полностью. Согласуйте уменьшение либо дождитесь приёмки.');
  o.respondedAt??=now;o.status='ready';o.contactsReleasedAt??=now;o.pickupBy=now+86400000;event(s,o,'Готов к выдаче. На получение — 24 часа. Склад ещё не списан.',now);
 }else if(kind==='issue'){
  if(!['ready','overdue'].includes(o.status))fail('Сначала подтвердите готовность.');
  for(const x of o.items){const p=s.products.find(p=>p.id===x.pid);if(p.reserved<x.qty||p.total<x.qty||(p.transit&&p.received<x.qty)||(x.allocated??x.qty)<x.qty)fail('Недостаточно фактического товара.');}
  for(const x of o.items){const p=s.products.find(p=>p.id===x.pid);p.total-=x.qty;p.reserved-=x.qty;if(p.transit)p.received-=x.qty;s.movements.unshift({id:crypto.randomUUID(),pid:p.id,name:p.name,supplierId:u.id,actor:u.id,source:'order',kind:'issue',qty:-x.qty,orderId:o.id,time:now});}
  o.status='done';allocateAll(s,now);event(s,o,'Товар фактически передан. Остаток и резерв списаны один раз.',now);
 }else fail('Неизвестное действие.');return {id:o.id};
}
export function snapshot(s,u,mode='buyer',now=Date.now()){
 const own=mode==='supplier'&&u?.supplier;
 const {tariffHistory,...ownProfile}=u?(s.profiles[u.id]||{}):{};
 return {profile:u?{...ownProfile,id:u.id}:null,products:s.products.filter(p=>own?p.supplierId===u.id:p.published&&catalogEntryEnabled(s,p)&&stockPublicationActive(p,now)&&checkSupplier(p,s,now)&&(!p.transit||p.arrival>=new Date(now+5*3600000).toISOString().slice(0,10))).map(p=>own?{...p,catalogHidden:!catalogEntryEnabled(s,p),categoryLabels:categoryLabels(s,p.category),available:free(p)}:{...Object.fromEntries(['id','baseId','physicalPartOf','batchSourceId','name','category','origin','height','pack','minOrderQty','price','color','kind','supplier','supplierId','city','address','transit','arrival','published','publicationUntil'].map(k=>[k,p[k]])),categoryLabels:categoryLabels(s,p.category),available:free(p)}),orders:u?s.orders.filter(o=>own?o.supplierId===u.id:o.buyerId===u.id).map(({buyerContact,orderMailSeen,...o})=>({...o,...(own&&o.supplierId===u.id&&o.contactsReleasedAt&&s.profiles[o.buyerId]?.consent?.privacy===PRIVACY_VERSION?{buyerContact:{phone:s.profiles[o.buyerId].phone,email:s.profiles[o.buyerId].email}}:{})})):[],movements:own?s.movements.filter(m=>m.supplierId===u.id):[],notifications:u?s.notifications.filter(n=>n.users.includes(u.id)).map(({users,readBy,...n})=>({...n,read:!!readBy?.includes(u.id)})):[],messages:u?s.messages.filter(m=>m.from===u.id||m.to===u.id):[]};
}
