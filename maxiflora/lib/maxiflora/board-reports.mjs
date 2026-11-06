import {DomainError} from './engine.mjs';
export const boardReportReasons=[
 {id:'fraud',ru:'Подозрение на мошенничество',kk:'Алаяқтық күдігі'},
 {id:'misleading',ru:'Недостоверное описание или условия',kk:'Сипаттама немесе шарттар дұрыс емес'},
 {id:'contacts',ru:'Неверные контакты',kk:'Байланыс деректері дұрыс емес'},
 {id:'spam',ru:'Спам или дубль',kk:'Спам немесе қайталанған хабарландыру'},
 {id:'prohibited',ru:'Недопустимое содержание',kk:'Рұқсат етілмеген мазмұн'},
 {id:'other',ru:'Другое',kk:'Басқа'}
];
const fail=(text,status=422)=>{throw new DomainError(text,status)};
// Explicit projection: no owner contacts, photo keys, drafts or history in the evidence.
export function reportSnapshot(s,ad){return {id:ad.id,version:ad.version,title:ad.title,description:ad.description,city:ad.city,category:ad.category,price:ad.price,pricing:ad.pricing,unit:ad.unit,composition:ad.composition,author:s.profiles[ad.ownerId]?.name||'Пользователь',publishedAt:ad.publishedAt,expires:ad.expires};}
export function ownBoardReports(s,u){return u?(s.boardReports||[]).filter(r=>r.reporterId===u.id).map(r=>({id:r.id,adId:r.adId,reason:r.reason,comment:r.comment,status:r.status,created:r.created,snapshot:r.snapshot,decision:r.decision||null})):[];}
export function createBoardReport(s,u,b,now=Date.now()){
 if(!u)fail('Войдите для подачи жалобы.',401);
 const ad=(s.boardAds||[]).find(a=>a.id===b.adId&&a.status==='published'&&a.expires>now);
 if(!ad)fail('Объявление больше не опубликовано. Обновите доску.',409);
 if(ad.ownerId===u.id)fail('Это ваше объявление. Его можно отредактировать или снять.');
 if(!Number.isInteger(b.version)||ad.version!==b.version)fail('Объявление изменилось. Обновите доску и проверьте актуальную версию.',409);
 if(!boardReportReasons.some(r=>r.id===b.reason))fail('Выберите причину из списка.');
 if(typeof b.comment!=='string'||b.comment.length>2000)fail('Комментарий — до 2000 символов.');
 const comment=b.comment.trim();if(b.reason==='other'&&!comment)fail('Для причины «Другое» добавьте пояснение.');
 s.boardReports??=[];
 if(s.boardReports.some(r=>r.adId===ad.id&&r.reporterId===u.id&&r.status==='open'))fail('Ваша жалоба на это объявление уже ожидает рассмотрения. Откройте «Мои жалобы».',409);
 const report={id:crypto.randomUUID(),adId:ad.id,reporterId:u.id,reason:b.reason,comment,status:'open',created:now,snapshot:reportSnapshot(s,ad)};
 s.boardReports.unshift(report);
 return {id:report.id,status:report.status};
}
