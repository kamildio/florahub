import {catalogEntryEnabled} from './catalog-directory.mjs';
import {activeOfferLimit} from './launch-policy.mjs';
import {DomainError} from './engine.mjs';
const DAY=86400000;
const fail=(text,status=422)=>{throw new DomainError(text,status)};
export function publicationDays(value=7){if(![3,5,7].includes(value))fail('Выберите срок публикации: 3, 5 или 7 дней.');return value;}
export function stockPublicationUntil(p){
 if(Number.isFinite(p.publicationUntil))return p.publicationUntil;
 const start=p.publicationStartedAt??(p.batchSourceId&&p.closedAt!==undefined?p.closedAt:p.createdAt);
 return Number.isFinite(start)?start+([3,5,7].includes(p.publicationDays)?p.publicationDays:7)*DAY:null;
}
export const stockPublicationActive=(p,now=Date.now())=>!!p.transit||(stockPublicationUntil(p)??-Infinity)>now;
export function startStockPublication(p,days,now,by='system'){
 const length=publicationDays(days);const previous=p.publicationStartedAt;
 p.publicationDays=length;p.publicationStartedAt=now;p.publicationUntil=now+length*DAY;p.published=true;p.publicationRevision=(p.publicationRevision||0)+1;
 delete p.publicationExpiredAt;delete p.publicationNeedsReview;
 p.publicationHistory??=[];p.publicationHistory.push({event:previous===undefined?'published':'renewed',time:now,by,days:length,until:p.publicationUntil});
}
export function renewStockPublication(s,u,p,days,confirmed,now){
 if(!u?.supplier||p.supplierId!==u.id)fail('Предложение недоступно.',403);
 if(!catalogEntryEnabled(s,p))fail('Товар или категория скрыты администратором.',403);
 if(p.transit)fail('Срок 3, 5 или 7 дней применяется к предложениям в наличии.');
 if(!u.approved||!u.plan||u.planUntil<=now)fail('Публикация требует одобренного профиля и активного тарифа.',403);
 const limit=activeOfferLimit(u.plan,s,u);
 if(s.products.filter(x=>x.id!==p.id&&x.supplierId===u.id&&x.published&&stockPublicationActive(x,now)).length>=limit)fail('Достигнут лимит предложений тарифа.');
 const length=publicationDays(days);
 if(confirmed!==true)fail('Подтвердите актуальность остатка, цены и свежесть цветов.');
 startStockPublication(p,length,now,u.id);return {id:p.id,publicationUntil:p.publicationUntil,publicationDays:length};
}
export function expireStockPublications(s,now){
 let changed=false;
 for(const p of s.products){
  if(p.transit)continue;
  if(![3,5,7].includes(p.publicationDays)){p.publicationDays=7;changed=true;}
  if(p.published&&!Number.isFinite(p.publicationUntil)){
   const start=p.publicationStartedAt??(p.batchSourceId&&p.closedAt!==undefined?p.closedAt:p.createdAt);
   p.publicationStartedAt=Number.isFinite(start)?start:null;p.publicationUntil=Number.isFinite(start)?start+p.publicationDays*DAY:now;
   p.publicationLegacy=true;if(!Number.isFinite(start))p.publicationNeedsReview=true;changed=true;
  }
  if(!p.published||stockPublicationActive(p,now))continue;
  p.published=false;p.publicationExpiredAt=p.publicationUntil;p.publicationRevision=(p.publicationRevision||0)+1;
  p.publicationHistory??=[];p.publicationHistory.push({event:p.publicationNeedsReview?'review-required':'expired',time:now,until:p.publicationUntil});
  s.notifications.unshift({id:crypto.randomUUID(),users:[p.supplierId],target:'offers',productId:p.id,text:p.publicationNeedsReview?'Дата размещения «'+p.name+'» неизвестна. Проверьте наличие и свежесть цветов, затем обновите предложение.':'Срок публикации «'+p.name+'» завершён. Проверьте наличие и свежесть цветов, затем обновите предложение.',time:now});changed=true;
 }
 return changed;
}
