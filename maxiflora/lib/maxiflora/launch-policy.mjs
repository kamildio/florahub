// Operator configuration. Registration accepts no campaign dates or entitlement fields.
// durationMonths may be 1, 2 or 3; existing grants keep their original expiry.
export const launchPolicy=Object.freeze({id:'first-clients-2026',revision:2,startDate:'2026-10-21',durationMonths:1,trialMonths:1,trialPlan:'MAX'});
export const tariffPlans=Object.freeze([
 {id:'Start',price:9990,limit:5,ru:'Наличие, базовые заказы',kk:'Қоймадағы тауар, негізгі тапсырыстар'},
 {id:'Business',price:24990,limit:12,ru:'Импорт наличия, отчёты, сборка',kk:'Қойма импорты, есептер, жинау'},
 {id:'MAX',price:44990,limit:null,ru:'Предзаказы, календарь, 3 бесплатных баннера',kk:'Алдын ала тапсырыс, күнтізбе, 3 тегін баннер'}
]);

export const tariffPlansFor=s=>s?.platformSettings?.tariffs||tariffPlans;
export const tariffRevision=s=>s?.platformSettings?.tariffRevision||1;
export function activeOfferLimit(plan,s,u){
 const grant=u?.tariffGrant,locked=grant?.plan===plan&&grant.until===u?.planUntil;
 const p=locked?grant:tariffPlansFor(s).find(x=>x.id===plan);
 return p?(p.limit===null?Infinity:p.limit):0;
}
// Capture the terms of an existing grant before publishing a new tariff revision.
export function captureTariffGrant(u,s,now=Date.now()){
 if(!u?.plan||!Number.isFinite(u.planUntil)||u.planUntil<=now||u.tariffGrant?.plan===u.plan&&u.tariffGrant?.until===u.planUntil)return;
 const p=tariffPlansFor(s).find(x=>x.id===u.plan);if(!p)return;
 u.tariffGrant={plan:p.id,until:u.planUntil,limit:p.limit,price:p.price,revision:tariffRevision(s)};
}
