import {DomainError} from './engine.mjs';
import {supplierIssues} from './company-profile.mjs';
import {requireStaffConfirmation} from './staff-security.mjs';
export function supplierAdminView(s,actor,ctx,now=Date.now()){
 requireStaffConfirmation(s,actor,ctx,{now});
 return {suppliers:Object.values(s.profiles).filter(p=>p.supplier).map(p=>({id:p.id,companyType:p.companyType,name:p.name,contact:p.contact,city:p.city,email:p.email,phone:p.phone,bin:p.bin,legalAddress:p.legalAddress,address:p.address,bank:p.bank,pendingBank:p.pendingBank||null,approved:p.approved,supplierStatus:p.supplierStatus||(p.approved?'approved':'draft'),profileVersion:p.profileVersion||0,submittedAt:p.submittedAt||null,review:p.supplierReview||null,issues:supplierIssues(p,s)})),audit:(s.supplierAdminAudit||[]).slice(-100).reverse()};
}
export function supplierAdminAction(s,actor,b,ctx,now=Date.now()){
 requireStaffConfirmation(s,actor,ctx,{critical:true,now});
 if(!['approve','reject','bank-approve','bank-reject'].includes(b.action))throw new DomainError('Действие недоступно.',403);
 const p=s.profiles[b.id];if(!p?.supplier)throw new DomainError('Поставщик не найден.',404);
 if(!Number.isSafeInteger(b.profileVersion)||b.profileVersion!==(p.profileVersion||0))throw new DomainError('Профиль изменился. Откройте актуальную версию.',409);
 if(typeof b.reason!=='string'||b.reason.trim().length<3||b.reason.length>1000)throw new DomainError('Укажите основание решения от 3 до 1000 символов.',422);
 const before={approved:p.approved,status:p.supplierStatus||'draft',bank:p.bank,pendingBank:p.pendingBank||null};
 if(b.action.startsWith('bank-')){
  if(!p.approved||!p.pendingBank)throw new DomainError('Нет изменения счёта для проверки.',409);
  if(b.action==='bank-approve'){const issues=supplierIssues({...p,bank:p.pendingBank},s);if(issues.length)throw new DomainError(issues.join(' '),422);p.bank=p.pendingBank;}delete p.pendingBank;
 }else{
  if(p.supplierStatus!=='pending')throw new DomainError('Профиль не находится на проверке.',409);
  if(b.action==='approve'){const issues=supplierIssues(p,s);if(issues.length)throw new DomainError(issues.join(' '),422);p.approved=true;p.complete=true;p.supplierStatus='approved';}
  else{p.approved=false;p.supplierStatus='rejected';}
  p.supplierReview={actor:actor.id,time:now,reason:b.reason.trim(),decision:b.action};
 }
 p.profileVersion=(p.profileVersion||0)+1;
 const entry={id:crypto.randomUUID(),actor:actor.id,subject:p.id,action:b.action,reason:b.reason.trim(),time:now,version:p.profileVersion,before,after:{approved:p.approved,status:p.supplierStatus,bank:p.bank,pendingBank:p.pendingBank||null}};
 s.supplierAdminAudit??=[];s.supplierAdminAudit.push(entry);p.profileHistory??=[];p.profileHistory.push({event:b.action,actor:actor.id,time:now,version:p.profileVersion,reason:b.reason.trim()});
 s.notifications.unshift({id:crypto.randomUUID(),users:[p.id],target:'profile',text:b.action==='approve'?'Профиль поставщика одобрен. Можно публиковать предложения в пределах тарифа.':b.action==='reject'?'Профиль поставщика возвращён: '+b.reason.trim():b.action==='bank-approve'?'Новые банковские реквизиты одобрены.':'Изменение банковских реквизитов отклонено: '+b.reason.trim(),time:now});
 return {ok:true,profileVersion:p.profileVersion};
}
