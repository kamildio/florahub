import {DomainError} from './engine.mjs';
import {PRIVACY_VERSION} from './privacy-policy.mjs';
export function privacyAction(s,u,b,now=Date.now()){
 if(!u)throw new DomainError('Войдите в аккаунт.',401);
 if(b.action==='privacy-delete-request'){
  if(typeof b.operationId!=='string'||!/^[-a-zA-Z0-9]{16,80}$/.test(b.operationId))throw new DomainError('Начните запрос заново.',400);
  const key=u.id+':privacy-delete:'+b.operationId;s.receipts??={};
  if(s.receipts[key])return s.receipts[key].result;
  s.supportCases??=[];
  const existing=s.supportCases.find(c=>c.privacyKind==='account-delete'&&c.participants.includes(u.id)&&!['resolved','closed'].includes(c.status));
  if(existing)return {id:existing.id,number:existing.number,submitted:true};
  const reason=typeof b.reason==='string'?b.reason.trim():'';
  if(reason.length>2000)throw new DomainError('Комментарий — до 2000 символов.',422);
  const c={id:crypto.randomUUID(),number:s.next++,version:1,topic:'privacy',privacyKind:'account-delete',subject:'Запрос на удаление аккаунта',orderId:null,participants:[u.id],created:now,updated:now,status:'new',messages:[{id:crypto.randomUUID(),by:u.id,text:'Прошу рассмотреть удаление моего аккаунта.'+(reason?' Комментарий: '+reason:''),visibility:'private',time:now}],history:[{time:now,text:'Запрос на удаление аккаунта зарегистрирован'}],emailNotice:{status:'pending',attempts:0,nextAt:now}};
  s.supportCases.unshift(c);
  const result={id:c.id,number:c.number,submitted:true};s.receipts[key]={result};
  return result;
 }
 if(b.action!=='privacy-marketing'||typeof b.enabled!=='boolean')throw new DomainError('Укажите свой выбор.',422);
 const prior=u.marketingConsent?.enabled===true;
 if(prior===b.enabled&&u.marketingConsent)return {saved:true,enabled:b.enabled};
 const entry={account:u.id,name:u.contact||u.consent?.name||u.name||'',version:PRIVACY_VERSION,time:now,enabled:b.enabled,channel:'cabinet',source:'settings'};
 u.marketingConsent={...entry};u.consentHistory??=[];u.consentHistory.push({kind:'marketing',...entry});
 return {saved:true,enabled:b.enabled};
}
export const marketingAllowed=u=>u?.marketingConsent?.enabled===true&&u.marketingConsent.version===PRIVACY_VERSION;

export function claimDeletionNotice(s,now=Date.now()){
 const c=(s.supportCases||[]).find(c=>c.privacyKind==='account-delete'&&c.emailNotice&&c.emailNotice.status!=='sent'&&c.emailNotice.attempts<5&&c.emailNotice.nextAt<=now);
 if(!c)return null;
 const lease=crypto.randomUUID();Object.assign(c.emailNotice,{status:'sending',lease,nextAt:now+300000,attempts:c.emailNotice.attempts+1});
 return {id:c.id,number:c.number,lease};
}
export function finishDeletionNotice(s,job,accepted,now=Date.now()){
 const c=s.supportCases?.find(c=>c.id===job.id);if(!c||c.emailNotice?.lease!==job.lease)return;
 Object.assign(c.emailNotice,{status:accepted?'sent':'pending',nextAt:now+300000});if(accepted)c.emailNotice.sentAt=now;
}
