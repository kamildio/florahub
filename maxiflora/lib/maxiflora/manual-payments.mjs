import {DomainError} from './engine.mjs';
import {requireHomeEditor} from './home-content.mjs';
import {tariffPlansFor,tariffRevision} from './launch-policy.mjs';
import {addAlmatyMonths} from './subscriptions.mjs';
import {paymentPolicy} from './payment-policy.mjs';
const fail=(m,status=422)=>{throw new DomainError(m,status)};
const text=(v,max=500)=>{if(typeof v!=='string'||!v.trim()||v.trim().length>max||/[\u0000-\u001f<>]/.test(v))fail('Заполните основание без разметки.');return v.trim()};
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v))),x=>x.toString(16).padStart(2,'0')).join('');
export const billingConfigured=env=>env?.MANUAL_PAYMENTS_ENABLED==='true'&&/^\d{6,16}:[A-Za-z0-9_-]{20,}$/.test(env.PAYMENTS_BOT_TOKEN||'')&&/^\d{5,20}$/.test(env.PAYMENTS_CHAT_ID||'');
const ensure=s=>s.billing??={revision:1,invoices:[],grants:[],audit:[],outbox:[]};
const ownInvoice=i=>({id:i.id,number:i.number,plan:i.plan,price:i.price,currency:'KZT',status:i.status,createdAt:i.createdAt,expiresAt:i.expiresAt,reportedAt:i.reportedAt,decidedAt:i.decidedAt,reason:i.reason,startsAt:i.startsAt,endsAt:i.endsAt});
export function paymentView(s,u,env,now=Date.now()){
 const c=s.billing;return {payments:{available:billingConfigured(env),url:billingConfigured(env)?paymentPolicy.url:null,recipient:paymentPolicy.recipient,invoices:u?(c?.invoices||[]).filter(i=>i.accountId===u.id).slice(-30).reverse().map(ownInvoice):[],scheduled:u?(c?.grants||[]).filter(g=>g.accountId===u.id&&g.status==='queued').map(g=>({id:g.id,plan:g.plan,startsAt:g.startsAt,endsAt:g.endsAt})):[]}};
}
export async function billingAdminView(s,u,ctx,env,now=Date.now()){
 try{await requireHomeEditor(s,u,ctx,false,now)}catch(e){if(e instanceof DomainError)return {billingAdmin:null};throw e}
 const c=s.billing||{revision:1,invoices:[],grants:[],audit:[],outbox:[]};
 return {billingAdmin:{revision:c.revision,configured:billingConfigured(env),accounts:Object.values(s.profiles).map(p=>({id:p.id,name:p.name||p.contact||p.email||p.id,phone:p.phone,email:p.email,plan:p.plan,planUntil:p.planUntil,version:p.accessVersion||0})),invoices:c.invoices.slice(-200).reverse().map(i=>({...ownInvoice(i),accountId:i.accountId,version:i.version,bankReference:i.bankReference,delivery:c.outbox.find(x=>x.invoiceId===i.id)?.status||null})),grants:c.grants.slice(-200).reverse(),audit:c.audit.slice(-100).reverse()}};
}
const audit=(c,u,event,target,details,now)=>{c.audit.push({id:crypto.randomUUID(),actorId:u.id,event,target,...details,time:now});c.audit=c.audit.slice(-1000);c.revision++};
function grant(s,c,account,plan,limit,price,revision,months,source,now){
 const future=c.grants.filter(g=>g.accountId===account.id&&g.status==='queued');
 const startsAt=Math.max(now,account.plan&&account.planUntil>now?account.planUntil:now,...future.map(g=>g.endsAt));
 const g={id:crypto.randomUUID(),accountId:account.id,plan,limit,price,tariffRevision:revision,startsAt,endsAt:addAlmatyMonths(startsAt,months),status:startsAt>now?'queued':'active',source,createdAt:now};c.grants.push(g);
 if(g.status==='active'){account.plan=g.plan;account.planUntil=g.endsAt;account.tariffGrant={plan:g.plan,until:g.endsAt,limit:g.limit,price:g.price,revision:g.tariffRevision};account.activeGrantId=g.id;}
 account.accessVersion=(account.accessVersion||0)+1;return g;
}
export function activateDueSubscriptions(s,now){
 const c=s.billing;if(!c)return false;let changed=false;
 for(const g of c.grants)if(g.status==='active'&&g.endsAt<=now){g.status='expired';changed=true}
 for(const p of Object.values(s.profiles)){
  const due=c.grants.filter(g=>g.accountId===p.id&&g.status==='queued'&&g.startsAt<=now).sort((a,b)=>a.startsAt-b.startsAt);
  for(const g of due){if(g.endsAt<=now){g.status='expired';changed=true;continue}g.status='active';p.plan=g.plan;p.planUntil=g.endsAt;p.tariffGrant={plan:g.plan,until:g.endsAt,limit:g.limit,price:g.price,revision:g.tariffRevision};p.activeGrantId=g.id;p.accessVersion=(p.accessVersion||0)+1;changed=true;}
 }
 if(changed)c.revision++;return changed;
}
export async function paymentAction(s,u,b,env,now=Date.now()){
 if(!u)fail('Войдите в аккаунт.',401);
 if(!billingConfigured(env))fail('Приём заявок на оплату ещё не открыт.',503);
 if(!['create','paid','cancel'].includes(b.action))fail('Действие недоступно.');
 const c=ensure(s);const fp=await hash(JSON.stringify({...b,operationId:undefined})),key=u.id+':payment:'+b.operationId;
 if(typeof b.operationId!=='string'||!/^[-a-zA-Z0-9]{16,80}$/.test(b.operationId))fail('Нужен идентификатор операции.',400);
 const prior=s.receipts?.[key];if(prior){if(prior.fingerprint!==fp)fail('Идентификатор использован для другой заявки.',409);return prior.result}
 let i;
 if(b.action==='create'){
  const p=tariffPlansFor(s).find(p=>p.id===b.plan);if(!p)fail('Выберите тариф.');if(b.tariffRevision!==tariffRevision(s))fail('Цены изменились. Обновите страницу.',409);
  i=c.invoices.find(i=>i.accountId===u.id&&(i.status==='review'||i.status==='awaiting'&&i.expiresAt>now));
  if(i&&i.plan!==p.id)fail('Сначала отмените текущую заявку или дождитесь её проверки.',409);
  if(!i){if(c.invoices.filter(x=>x.accountId===u.id&&x.createdAt>now-86400000).length>=10)fail('Лимит 10 заявок в сутки. Обратитесь в поддержку.',429);const id=crypto.randomUUID();i={id,number:'MF-'+id.toUpperCase(),accountId:u.id,plan:p.id,price:p.price,limit:p.limit,tariffRevision:tariffRevision(s),createdAt:now,expiresAt:now+86400000,status:'awaiting',version:1};c.invoices.push(i);c.revision++;}
 }else{
  i=c.invoices.find(i=>i.id===b.id&&i.accountId===u.id);if(!i)fail('Заявка не найдена.',404);
  if(b.action==='paid'&&i.status==='review')return {invoice:ownInvoice(i)};
  if(i.status!=='awaiting')fail('Состояние заявки изменилось.',409);
  if(b.action==='paid'){
   if(i.expiresAt<=now)fail('Срок заявки истёк. Создайте новую. Если деньги уже отправлены, обратитесь в поддержку.',409);
   i.status='review';i.reportedAt=now;c.outbox.push({id:crypto.randomUUID(),invoiceId:i.id,status:'pending',attempts:0,nextAt:now});
  }else i.status='cancelled';i.version++;c.revision++;
 }
 const result={invoice:ownInvoice(i)};s.receipts??={};s.receipts[key]={fingerprint:fp,result,time:now};return result;
}
export async function billingAdminAction(s,u,b,ctx,now=Date.now()){
 await requireHomeEditor(s,u,ctx,true,now);
 if(!['confirm','reject','grant','revoke'].includes(b.action))fail('Действие недоступно.');
 if(typeof b.operationId!=='string'||!/^[-a-zA-Z0-9]{16,80}$/.test(b.operationId))fail('Нужен идентификатор операции.',400);
 const c=ensure(s),fp=await hash(JSON.stringify({...b,operationId:undefined})),key=u.id+':billing-admin:'+b.operationId,prior=s.receipts?.[key];if(prior){if(prior.fingerprint!==fp)fail('Идентификатор использован.',409);return prior.result}
 let result;
 if(['confirm','reject'].includes(b.action)){
  const i=c.invoices.find(i=>i.id===b.id);if(!i)fail('Заявка не найдена.',404);
  if(i.version!==b.version||i.status!=='review')fail('Заявка уже обработана или изменилась.',409);
  const reason=text(b.reason),account=s.profiles[i.accountId];if(!account)fail('Аккаунт не найден.',404);
  if(b.action==='confirm'){
   const reference=text(b.bankReference,100).toUpperCase();if(!/^[A-ZА-ЯЁ0-9 ._/-]{3,100}$/.test(reference))fail('Укажите номер банковской операции.');
   const referenceKey=reference.replace(/[ ._/-]/g,'');if(referenceKey.length<3)fail('Проверьте номер банковской операции.');if(c.invoices.some(x=>x.bankReferenceKey===referenceKey||x.bankReference===reference))fail('Эта банковская операция уже использована.',409);
   if(b.amount!==i.price)fail('Сумма поступления должна совпадать с суммой заявки.');
   const g=grant(s,c,account,i.plan,i.limit,i.price,i.tariffRevision,1,i.id,now);i.startsAt=g.startsAt;i.endsAt=g.endsAt;i.bankReference=reference;i.bankReferenceKey=referenceKey;i.grantId=g.id;i.status='confirmed';
  }else i.status='rejected';
  i.reason=reason;i.decidedAt=now;i.decidedBy=u.id;i.version++;audit(c,u,b.action,i.id,{accountId:i.accountId,reason},now);
  s.notifications.unshift({id:crypto.randomUUID(),users:[account.id],target:'tariffs',text:i.status==='confirmed'?'Оплата тарифа подтверждена. Период доступа указан в тарифах.':'Заявка на оплату отклонена. Причина: '+reason,time:now});result={ok:true,id:i.id};
 }else{
  const account=s.profiles[b.accountId];if(!account)fail('Аккаунт не найден.',404);
  if(b.version!==(account.accessVersion||0))fail('Доступ изменился. Обновите данные.',409);
  const reason=text(b.reason),before={plan:account.plan,planUntil:account.planUntil};
  if(b.action==='grant'){
   const p=tariffPlansFor(s).find(p=>p.id===b.plan);if(!p||!Number.isSafeInteger(b.months)||b.months<1||b.months>12)fail('Выберите тариф и срок от 1 до 12 месяцев.');
   const g=grant(s,c,account,p.id,p.limit,0,tariffRevision(s),b.months,'manual',now);result={ok:true,id:g.id};
  }else{
   for(const g of c.grants)if(g.accountId===account.id&&['queued','active'].includes(g.status)){g.status='revoked';g.revokedAt=now;g.reason=reason}
   account.plan=null;account.planUntil=now;delete account.tariffGrant;delete account.activeGrantId;account.accessVersion=(account.accessVersion||0)+1;result={ok:true};
  }
  audit(c,u,b.action,account.id,{before,after:{plan:account.plan,planUntil:account.planUntil},reason},now);
  s.notifications.unshift({id:crypto.randomUUID(),users:[account.id],target:'tariffs',text:b.action==='grant'?'Администратор предоставил период подписки. Подробности в тарифах.':'Доступ к новым продажам отозван. Причина: '+reason,time:now});
 }
 s.receipts??={};s.receipts[key]={fingerprint:fp,result,time:now};return result;
}
// Durable outbox; no bank confirmation or client identity is transmitted to Telegram.
export function claimPaymentNotice(s,now){const c=s.billing;if(!c)return null;const n=c.outbox.find(n=>n.status!=='sent'&&n.nextAt<=now&&(!n.leaseUntil||n.leaseUntil<=now));if(!n)return null;const invoice=c.invoices.find(i=>i.id===n.invoiceId);if(!invoice||invoice.status!=='review'){n.status='sent';return null}n.lease=crypto.randomUUID();n.leaseUntil=now+60000;n.attempts++;return {id:n.id,lease:n.lease,number:invoice.number,plan:invoice.plan,price:invoice.price}}
export function finishPaymentNotice(s,job,ok,now){const n=s.billing?.outbox.find(n=>n.id===job.id&&n.lease===job.lease);if(!n)return;n.status=ok?'sent':'pending';n.nextAt=now+Math.min(3600000,60000*2**Math.min(n.attempts,6));n.leaseUntil=null;delete n.lease;}
export async function sendPaymentNotice(env,job,send=env.PAYMENTS_TELEGRAM_FETCH||fetch){
 if(!billingConfigured(env))return false;
 try{const r=await send('https://api.telegram.org/bot'+env.PAYMENTS_BOT_TOKEN+'/sendMessage',{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:env.PAYMENTS_CHAT_ID,text:'MaXiFlora · Заявка на проверку оплаты\n'+job.number+'\nТариф: '+job.plan+'\nСумма: '+job.price+' ₸\nПроверьте поступление в Kaspi Pay и обработайте заявку в кабинете.\nhttps://www.maxiflora.kz/#admin',link_preview_options:{is_disabled:true}})});if(!r.ok)return false;const data=await r.json();return data.ok===true}catch{return false}
}
