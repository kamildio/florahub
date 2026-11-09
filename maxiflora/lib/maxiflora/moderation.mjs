import {DomainError} from './engine.mjs';
import {validateBoardAd} from './board.mjs';
import {reportSnapshot} from './board-reports.mjs';
import {adPhotos} from './media.mjs';
export const TEST_MODERATOR='demo-moderator';
export const testModeratorProfile={id:TEST_MODERATOR,name:'Модератор · тест',supplier:false,verified:false,complete:false,city:'Шымкент'};
const fail=(message,status=422)=>{throw new DomainError(message,status)};
// Context is supplied by the route, never from a body, profile role, query or header.
export const isTestModerator=(u,context)=>u?.id===TEST_MODERATOR&&context?.testMode===true&&typeof context.workspace==='string'&&context.workspace.startsWith('sandbox:');
export function requireTestModerator(u,context){if(!isTestModerator(u,context))fail('Кабинет модератора доступен только тестовому модератору в его тестовом пространстве.',403);}
const safeAd=(s,ad,now=Date.now())=>ad?{...reportSnapshot(s,ad),status:ad.status,submitted:ad.submitted,photos:adPhotos(s,ad),activeCount:(s.boardAds||[]).filter(a=>a.ownerId===ad.ownerId&&a.status==='published'&&a.expires>now).length,previous:(()=>{const prev=ad.history?.findLast(h=>h.event==='edited')?.previous;return prev?reportSnapshot(s,prev):null})()}:null;
export function moderationView(s,u,context,now=Date.now()){
 if(!context?.productionAuthorized&&!isTestModerator(u,context))return {moderation:null};
 return {moderation:{testOnly:!context?.productionAuthorized,ads:(s.boardAds||[]).filter(a=>['pending','approved'].includes(a.status)).map(a=>safeAd(s,a,now)),reports:(s.boardReports||[]).filter(r=>r.status==='open').map(r=>({id:r.id,reason:r.reason,comment:r.comment,created:r.created,snapshot:r.snapshot,current:safeAd(s,(s.boardAds||[]).find(a=>a.id===r.adId),now)})),audit:(s.moderationAudit||[]).map(a=>({...a})).slice(-100).reverse()}};
}
function comment(b,required){if(typeof b.reason!=='string'||b.reason.length>1000||required&&b.reason.trim().length<10)fail(required?'Укажите основание от 10 до 1000 символов.':'Комментарий — до 1000 символов.');return b.reason.trim();}
function notify(s,userId,text,adId,reportId,time){s.notifications??=[];s.notifications.unshift({id:crypto.randomUUID(),users:[userId],target:'board',adId,reportId,text,time});}
function record(s,u,ad,before,event,reason,now,reportId){
 s.moderationAudit??=[];const entry={id:crypto.randomUUID(),actorId:u.id,actor:u.name||'Модератор',time:now,event,adId:ad.id,adTitle:ad.title,reviewedVersion:before.version,before:{status:before.status,version:before.version},after:{status:ad.status,version:ad.version},reason,...(reportId?{reportId}:{})};
 s.moderationAudit.push(entry);return entry;
}
export function moderationAction(s,u,b,context,now=Date.now()){
 if(!context?.productionAuthorized)requireTestModerator(u,context);
 if(!['moderation-approve','moderation-reject','moderation-publish','moderation-report'].includes(b.action))fail('Это действие недоступно модератору.',403);
 const report=b.action==='moderation-report'?(s.boardReports||[]).find(r=>r.id===b.reportId&&r.status==='open'):null;
 if(b.action==='moderation-report'&&!report)fail('Жалоба уже рассмотрена или недоступна. Обновите очередь.',409);
 const ad=(s.boardAds||[]).find(a=>a.id===(report?report.adId:b.id));if(!ad)fail('Материал недоступен.',404);
 if(ad.ownerId===u.id)fail('Собственный материал нельзя модерировать.',403);
 if(!Number.isInteger(b.version)||ad.version!==b.version)fail('Материал изменён. Откройте актуальную версию.',409);
 const before={status:ad.status,version:ad.version},reason=comment(b,['moderation-reject','moderation-report'].includes(b.action));
 if(b.action==='moderation-report'){
  if(!['confirmed','unconfirmed'].includes(b.outcome))fail('Выберите результат рассмотрения жалобы.');
  // A complaint against an older version remains reviewable, with both versions shown.
  // Confirming can hide only the reviewed, currently published version.
  if(b.outcome==='confirmed'&&(ad.status!=='published'||ad.expires<=now))fail('Объявление уже не опубликовано. Проверьте актуальный материал.',409);
  if(b.outcome==='confirmed'){
   ad.status='rejected';ad.version++;ad.moderationDecision={outcome:'report-confirmed',reason,time:now,reviewedVersion:before.version};
   ad.history.push({time:now,event:'report-confirmed',reason,reviewedVersion:before.version});
   notify(s,ad.ownerId,'Объявление «'+ad.title+'» отклонено после проверки. Требуемое исправление: '+reason,ad.id,null,now);
  }
  report.status='closed';report.decision={outcome:b.outcome,reason,time:now,reviewedVersion:before.version};
  record(s,u,ad,before,'report-'+b.outcome,reason,now,report.id);
  notify(s,report.reporterId,'Жалоба на «'+report.snapshot.title+'» рассмотрена. '+(b.outcome==='confirmed'?'Подтверждена.':'Не подтверждена.')+' '+reason,ad.id,report.id,now);
  return {id:report.id,status:report.status,decision:report.decision};
 }
 if(b.action==='moderation-publish'){
  if(ad.status!=='approved')fail('Сначала одобрите актуальную версию объявления.',409);
 }else if(ad.status!=='pending')fail('Объявление уже не находится на модерации. Обновите очередь.',409);
 if(b.action!=='moderation-reject'){
  validateBoardAd(ad);
  if((ad.photoIds||[]).length)fail('Фото ещё не прошли проверку безопасности и обработку. Одобрение и публикация недоступны.',409);
 }
 if(b.action==='moderation-publish'){
  if((s.boardAds||[]).filter(a=>a.ownerId===ad.ownerId&&a.status==='published'&&a.expires>now).length>=5)fail('У автора уже пять действующих объявлений. Освободите место и повторите публикацию.',409);
  ad.status='published';ad.publishedAt=now;ad.expires=now+30*86400000;
 }else ad.status=b.action==='moderation-approve'?'approved':'rejected';
 ad.version++;ad.moderationDecision={outcome:ad.status,reason,time:now,reviewedVersion:before.version};
 ad.history.push({time:now,event:ad.status,reason,reviewedVersion:before.version});record(s,u,ad,before,ad.status,reason,now);
 notify(s,ad.ownerId,'Объявление «'+ad.title+'»: '+({approved:'одобрено, ожидает публикации.',rejected:'отклонено. '+reason,published:'опубликовано на 30 дней.'}[ad.status]),ad.id,null,now);
 return {id:ad.id,status:ad.status,version:ad.version};
}
