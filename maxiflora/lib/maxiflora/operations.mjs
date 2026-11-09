import {DomainError} from './engine.mjs';
import {requireHomeEditor,homeAssets,ensureHomeContent} from './home-content.mjs';
import {staffRoles,staffPermissions} from './staff-permissions.mjs';
const DAY=86400000,fail=(m,status=422)=>{throw new DomainError(m,status)},text=(v,max=4000)=>{if(typeof v!=='string'||!v.trim()||v.trim().length>max||/[<>\u0000-\u0008]/.test(v))fail('Заполните текст без разметки.');return v.trim()};
export function bannerPeriod(now){const d=new Date(now+5*3600000),start=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1)-5*3600000,end=Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1)-5*3600000;return {key:d.toISOString().slice(0,7),start,end,limit:3,maxDays:7};}
const maxAccess=(u,now)=>u?.supplier===true&&u.approved===true&&u.plan==='MAX'&&u.planUntil>now;
const displayed=(x,now)=>({...x,status:x.status==='pending'&&x.period!==bannerPeriod(now).key||x.status==='approved'&&x.endsAt<=now?'expired':x.status});
const used=(s,id,key)=>(s.supplierBanners||[]).filter(x=>x.accountId===id&&x.period===key&&x.approvedAt).length;
const note=(s,users,message,target,time)=>{s.notifications??=[];s.notifications.unshift({id:crypto.randomUUID(),users:[...new Set(users)],target,text:message,time})};
const audit=(s,u,event,target,reason,now)=>{s.operationsAudit??=[];s.operationsAudit.push({id:crypto.randomUUID(),actorId:u.id,event,target,reason,time:now})};
export function supplierBannerView(s,u,now=Date.now()){const period=bannerPeriod(now);return {supplierAdvertising:u?{eligible:maxAccess(u,now),period,used:used(s,u.id,period.key),assets:homeAssets.filter(a=>!a.ruOnly),items:(s.supplierBanners||[]).filter(x=>x.accountId===u.id).map(x=>displayed(x,now)).slice(-50).reverse()}:null};}
export async function operationsView(s,u,ctx,now=Date.now()){
 const permissions=staffPermissions(s,u,ctx),out={operationsAdmin:null};if(!permissions.length)return out;
 try{await requireHomeEditor(s,u,ctx,false,now,permissions[0])}catch(e){if(e instanceof DomainError)return out;throw e}
 const allowed=p=>permissions.includes(p);out.operationsAdmin={permissions,roles:staffRoles,
 ...(allowed('ads')?{banners:(s.supplierBanners||[]).slice(-200).reverse().map(x=>({...displayed(x,now),accountName:s.profiles[x.accountId]?.name}))}:{}),
 ...(allowed('support')?{cases:(s.supportCases||[]).slice(0,200).map(c=>({...c,version:c.version||1,participants:c.participants.map(id=>({id,name:s.profiles[id]?.name||'Клиент'})),order:c.orderId?(()=>{const o=s.orders.find(o=>o.id===c.orderId);return o?{id:o.id,status:o.status,buyer:o.buyer,supplier:o.supplier,items:o.items.map(x=>({name:x.name,qty:x.qty})),history:o.history,discipline:o.discipline}:null})():null}))}:{}),
 ...(allowed('staff')?{members:Object.entries(s.staffMembers||{}).map(([id,x])=>({id,...x,name:s.profiles[id]?.name,email:s.profiles[id]?.email})),accounts:Object.values(s.profiles||{}).filter(p=>p.id!==ctx.ownerId&&p.verified&&p.verificationMethod==='email').map(p=>({id:p.id,name:p.name,email:p.email})),audit:(s.operationsAudit||[]).slice(-100).reverse()}:{}),
 };return out;
}
export async function operationsAction(s,u,b,ctx,now=Date.now()){
 if(!u)fail('Войдите в аккаунт.',401);if(typeof b.action!=='string')fail('Укажите действие.',400);
 const supplier=['banner-submit','banner-withdraw','case-new','case-reopen'].includes(b.action);
 const scope=b.action?.startsWith('staff-')?'staff':b.action?.startsWith('banner-')?'ads':'support';
 if(!supplier)await requireHomeEditor(s,u,ctx,true,now,scope);
 if(typeof b.operationId!=='string'||!/^[-a-zA-Z0-9]{16,80}$/.test(b.operationId))fail('Нужен идентификатор операции.',400);
 const fp=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({...b,operationId:undefined})))),x=>x.toString(16).padStart(2,'0')).join(''),key=u.id+':operations:'+b.operationId;s.receipts??={};const prior=s.receipts[key];if(prior){if(prior.fingerprint!==fp)fail('Идентификатор уже использован.',409);return prior.result}
 let result;
 if(b.action==='banner-submit'){
  if(!maxAccess(u,now))fail('Бесплатные баннеры доступны одобренному поставщику с действующим MAX.',403);
  const period=bannerPeriod(now);if(used(s,u.id,period.key)>=3)fail('Три бесплатных размещения в этом месяце уже использованы.',409);
  s.supplierBanners??=[];if(s.supplierBanners.filter(x=>x.accountId===u.id&&x.createdAt>now-DAY).length>=10)fail('Не более 10 заявок в сутки.',429);if(s.supplierBanners.filter(x=>x.accountId===u.id&&x.status==='pending'&&x.period===period.key).length>=3-used(s,u.id,period.key))fail('Дождитесь рассмотрения текущих заявок.',409);
  if(!homeAssets.some(a=>a.id===b.asset&&!a.ruOnly))fail('Выберите изображение из библиотеки.');
  if(!Number.isInteger(b.days)||b.days<1||b.days>7)fail('Показ — от 1 до 7 дней.');
  if(!Number.isSafeInteger(b.startsAt)||b.startsAt<now-60000||b.startsAt>=period.end||b.startsAt>=u.planUntil)fail('Начало — в текущем месяце в период действия MAX.');
  if(!['ru','kk'].includes(b.language||'ru'))fail('Выберите язык баннера.');const item={id:crypto.randomUUID(),version:1,language:b.language||'ru',accountId:u.id,period:period.key,status:'pending',asset:b.asset,title:text(b.title,120),description:text(b.description,240),days:b.days,requestedStart:b.startsAt,createdAt:now};s.supplierBanners.push(item);result={id:item.id};
 }else if(['banner-approve','banner-reject','banner-withdraw','banner-remove'].includes(b.action)){
  const item=(s.supplierBanners||[]).find(x=>x.id===b.id);if(!item||b.action==='banner-withdraw'&&item.accountId!==u.id)fail('Заявка недоступна.',403);if(item.version!==b.version)fail('Заявка изменена. Обновите список.',409);
  if(['banner-withdraw','banner-remove'].includes(b.action)){if(b.action==='banner-remove')item.reason=text(b.reason,1000);if(!['pending','approved'].includes(item.status))fail('Размещение уже завершено.',409);item.status='withdrawn';}
  else {if(item.status!=='pending')fail('Заявка уже рассмотрена.',409);item.reason=text(b.reason,1000);
   if(b.action==='banner-reject')item.status='rejected';else {if(item.accountId===u.id&&u.id!==ctx.ownerId)fail('Свой баннер должен одобрить другой модератор.',403);
    const owner=s.profiles[item.accountId],period=bannerPeriod(now);if(!maxAccess(owner,now)||period.key!==item.period)fail('Период или MAX закончился. Нужна новая заявка.',409);if(used(s,owner.id,period.key)>=3)fail('Лимит размещений исчерпан.',409);
    const start=Math.max(now,item.requestedStart),end=Math.min(start+item.days*DAY,period.end,owner.planUntil);if(end<=start)fail('Срок показа закончился.',409);
    Object.assign(item,{status:'approved',approvedAt:now,startsAt:start,endsAt:end});const c=ensureHomeContent(s);c.items.push({id:'supplier-'+item.id,supplierBannerId:item.id,sponsorId:owner.id,type:'banner',asset:item.asset,languages:item.language||'ru',ru:{title:item.title,description:item.description,body:'',cta:'Открыть поставщика'},kk:{title:item.title,description:item.description,body:'',cta:'Жеткізушіні ашу'},destination:'supplier-profile',startsAt:start,endsAt:end,position:100+c.items.length,status:'published',version:1,createdAt:now,updatedAt:now});c.revision++;
   }
  }
  if(item.status==='withdrawn'){const c=ensureHomeContent(s),home=c.items.find(x=>x.supplierBannerId===item.id);if(home){home.status='withdrawn';home.version++;c.revision++}}
  item.version++;item.decidedBy=u.id;note(s,[item.accountId],'Заявка на баннер: '+item.status+(item.reason?' · '+item.reason:''),'advertising',now);audit(s,u,b.action,item.id,item.reason||'Снято автором',now);result={id:item.id,status:item.status};
 }else if(b.action==='case-new'){
  if(!u.verified)fail('Подтвердите аккаунт.',403);if(!['general','payment','complaint','dispute'].includes(b.topic))fail('Выберите тему.');
  const order=b.orderId?s.orders.find(o=>o.id===Number(b.orderId)&&[o.buyerId,o.supplierId].includes(u.id)):null;if(b.orderId&&!order)fail('Заказ недоступен.',403);if(b.topic==='dispute'&&!order)fail('Для спора укажите ваш заказ.');
  s.supportCases??=[];if(order&&s.supportCases.some(c=>c.orderId===order.id&&!['resolved','closed'].includes(c.status)))fail('По заказу уже открыто обращение. Дополните его.',409);if(s.supportCases.filter(c=>c.participants.includes(u.id)&&!['resolved','closed'].includes(c.status)).length>=10)fail('Сначала дождитесь ответа по открытым обращениям.',429);
  const c={id:crypto.randomUUID(),number:s.next++,version:1,topic:b.topic,subject:text(b.subject,160),orderId:order?.id||null,participants:order?[...new Set([order.buyerId,order.supplierId])]:[u.id],created:now,updated:now,status:'new',messages:[{id:crypto.randomUUID(),by:u.id,text:text(b.text),visibility:b.private?'private':'shared',time:now}],history:[{time:now,text:'Обращение зарегистрировано'}]};s.supportCases.unshift(c);result={id:c.id};
 }else if(b.action==='case-reopen'){
  const c=(s.supportCases||[]).find(c=>c.id===b.id&&c.participants.includes(u.id));if(!c)fail('Обращение недоступно.',403);if((c.version||1)!==b.version)fail('Обращение изменилось.',409);if(!['resolved','closed'].includes(c.status)||now-(c.resolvedAt||c.updated)>7*DAY)fail('Повторное открытие доступно в течение 7 дней после решения. Создайте новое обращение.');c.status='new';c.version=(c.version||1)+1;c.updated=now;c.messages.push({id:crypto.randomUUID(),by:u.id,text:text(b.text),visibility:'shared',time:now});c.history.push({time:now,text:'Клиент повторно открыл обращение'});result={id:c.id};
 }else if(b.action==='case-update'){
  const c=(s.supportCases||[]).find(c=>c.id===b.id);if(!c)fail('Обращение не найдено.',404);if(c.participants.includes(u.id))fail('Своё обращение должен рассмотреть другой сотрудник.',403);if((c.version||1)!==b.version)fail('Обращение изменилось. Обновите очередь.',409);
  if(!['working','waiting-buyer','waiting-supplier','resolved','closed'].includes(b.status))fail('Выберите статус.');
  const reason=text(b.text);if(!['shared','private','internal'].includes(b.visibility))fail('Выберите видимость.');if(b.visibility==='private'&&!c.participants.includes(b.to))fail('Выберите получателя.');
  if(['resolved','closed'].includes(b.status)&&b.visibility!=='shared')fail('Итоговое решение должно быть видно всем участникам.');
  c.messages.push({id:crypto.randomUUID(),by:u.id,author:'Поддержка MaXiFlora',text:reason,visibility:b.visibility,...(b.visibility==='private'?{to:b.to}:{}),time:now});c.status=b.status;c.assignedTo=u.id;c.version=(c.version||1)+1;c.updated=now;
  c.history.push({time:now,text:'Статус: '+b.status,by:u.id});if(['resolved','closed'].includes(b.status)){c.resolvedAt=now;c.resolution=reason;if(b.neutralDiscipline===true&&c.orderId){const o=s.orders.find(o=>o.id===c.orderId);if(o){o.discipline={neutral:true,reason,time:now,by:u.id};o.history.push({time:now,text:'По обращению № '+c.number+' исключено влияние на дисциплину: '+reason})}}}
  note(s,b.visibility==='internal'?[]:b.visibility==='private'?[b.to]:c.participants,'Ответ поддержки по обращению № '+c.number,'support',now);audit(s,u,'case-'+b.status,c.id,reason,now);result={id:c.id};
 }else if(['staff-save','staff-revoke'].includes(b.action)){
  if(b.accountId===ctx.ownerId)fail('Права владельца нельзя изменить.',403);const target=s.profiles[b.accountId];if(!target?.verified||target.verificationMethod!=='email')fail('Нужен существующий аккаунт с подтверждённой почтой.');s.staffMembers??={};const old=s.staffMembers[target.id];if((old?.version||0)!==b.version)fail('Права уже изменены.',409);const reason=text(b.reason,1000);if(b.action==='staff-save'&&!Object.hasOwn(staffRoles,b.role))fail('Выберите роль.');
  s.staffMembers[target.id]={role:b.action==='staff-save'?b.role:old?.role,active:b.action==='staff-save',version:(old?.version||0)+1,updatedAt:now,updatedBy:u.id};if(s.staffSecurity?.[target.id])s.staffSecurity[target.id].sessions={};audit(s,u,b.action,target.id,reason,now);note(s,[target.id],'Права сотрудника обновлены. Для работы требуется подтверждение Authenticator.','account',now);result={id:target.id};
 }else fail('Неизвестное действие.',400);
 s.receipts[key]={fingerprint:fp,result,time:now};return result;
}
