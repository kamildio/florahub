import {DomainError} from './engine.mjs';
import {launchPolicy,tariffPlansFor,tariffRevision,activeOfferLimit} from './launch-policy.mjs';
const DAY=86400000,OFFSET=5*3600000;
const fail=(text,status=422)=>{throw new DomainError(text,status)};
// Calendar months in Asia/Almaty (UTC+05), clamped to the last day of the target month.
export function addAlmatyMonths(time,months){
 const d=new Date(time+OFFSET),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);
 const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.getTime()-OFFSET;
}
export function campaignView(now=Date.now(),policy=launchPolicy){
 if(![1,2,3].includes(policy.durationMonths)||policy.trialMonths!==1||policy.trialPlan!=='MAX'||!/^\d{4}-\d{2}-\d{2}$/.test(policy.startDate))throw new Error('Invalid launch campaign configuration');
 const startsAt=Date.parse(policy.startDate+'T00:00:00+05:00'),endsAt=addAlmatyMonths(startsAt,policy.durationMonths);
 if(!Number.isFinite(startsAt)||new Date(startsAt+OFFSET).toISOString().slice(0,10)!==policy.startDate)throw new Error('Invalid launch campaign date');
 return {...policy,startsAt,endsAt,lastRegistrationDate:new Date(endsAt-1+OFFSET).toISOString().slice(0,10),status:now<startsAt?'scheduled':now<endsAt?'active':'ended'};
}
export function enrollNewAccount(u,now=Date.now(),policy=launchPolicy){
 // Called only for the server-created profile during registration, never on login or role changes.
 if(u.registeredAt!==undefined||u.launchTrial)return;
 u.registeredAt=now;const campaign=campaignView(now,policy);
 if(campaign.status!=='active')return;
 u.launchTrial={campaignId:campaign.id,revision:campaign.revision,startsAt:now,endsAt:addAlmatyMonths(now,1),plan:campaign.trialPlan};
 u.plan=campaign.trialPlan;u.planUntil=u.launchTrial.endsAt;
}
export function upgradeLaunchTrial(u,now=Date.now()){
 const trial=u?.launchTrial;if(!trial||trial.campaignId!==launchPolicy.id||trial.plan!=='Start'||trial.endsAt<=now)return false;
 trial.plan='MAX';trial.revision=launchPolicy.revision;
 if(u.plan==='Start'&&u.planUntil===trial.endsAt)u.plan='MAX';return true;
}
export function ensureTariffHistory(u){
 upgradeLaunchTrial(u);
 if(!u||Number.isSafeInteger(u.tariffVersion))return;
 u.tariffVersion=0;u.tariffHistory=[];
 // A legacy choice has no recorded price. Do not invent one during migration.
 if(u.tariffPreference){
  const previous=u.tariffPreference,id=crypto.randomUUID();u.tariffVersion=1;
  u.tariffPreference={id,plan:previous.plan,selectedAt:previous.selectedAt,price:null,currency:'KZT',months:1,legacy:true};
  u.tariffHistory.push({id:crypto.randomUUID(),sequence:1,type:'selected',time:previous.selectedAt,selectionId:id,plan:previous.plan,price:null,currency:'KZT',months:1,legacy:true});
 }
}
export function tariffHistoryPage(u,before){
 if(!u)fail('Войдите для просмотра истории тарифов.',401);
 if(before!==undefined&&(!Number.isSafeInteger(before)||before<1))fail('Неверная страница истории.',400);
 const all=u.tariffHistory||[],matching=before===undefined?all:all.filter(x=>x.sequence<before),items=matching.slice(-20).reverse();
 return {items,total:all.length,version:u.tariffVersion||0,nextBefore:matching.length>items.length?items.at(-1).sequence:null};
}
export function subscriptionView(u,now=Date.now(),s){
 const trial=u?.launchTrial;
 return {campaign:campaignView(now),subscription:u?{trial:trial?{campaignId:trial.campaignId,startsAt:trial.startsAt,endsAt:trial.endsAt,plan:trial.plan,status:now<trial.endsAt?'active':'expired',daysLeft:Math.max(0,Math.ceil((trial.endsAt-now)/DAY))}:null,activePlan:u.plan&&u.planUntil>now?u.plan:null,planUntil:u.planUntil||null,activeOfferLimit:u.plan&&u.planUntil>now?(Number.isFinite(activeOfferLimit(u.plan,s,u))?activeOfferLimit(u.plan,s,u):null):null,preference:u.tariffPreference?{...u.tariffPreference}:null,preferenceVersion:u.tariffVersion||0,history:tariffHistoryPage(u),paymentAvailable:false}:null};
}
export function subscriptionAction(s,u,b,now=Date.now()){
 if(!u)fail('Войдите для выбора тарифа.',401);
 if(!['tariff-preference','tariff-preference-clear'].includes(b.action))fail('Действие тарифа недоступно.',403);
 const plan=tariffPlansFor(s).find(p=>p.id===b.plan);
 if(b.action==='tariff-preference'&&!plan)fail('Выберите Start, Business или MAX.');
 if(b.action==='tariff-preference'&&(b.tariffRevision??1)!==tariffRevision(s))fail('Условия тарифа изменились. Обновите цены перед выбором.',409);
 ensureTariffHistory(u);
 if(!Number.isSafeInteger(b.preferenceVersion)||b.preferenceVersion!==u.tariffVersion)fail('Выбор тарифа изменился. Обновите данные и повторите действие.',409);
 if(b.action==='tariff-preference-clear'){
  const previous=u.tariffPreference;
  if(!previous||b.selectionId!==previous.id)fail('Этот предварительный выбор больше не действует. Обновите данные.',409);
  u.tariffVersion++;
  u.tariffHistory.push({id:crypto.randomUUID(),sequence:u.tariffVersion,type:'cleared',time:now,selectionId:previous.id,plan:previous.plan,price:previous.price,currency:'KZT',months:1,legacy:!!previous.legacy});
  u.tariffPreference=null;return {saved:true,cleared:true,activated:false};
 }
 // An intent is not payment or activation and never shortens or renews a trial.
 if(u.tariffPreference?.plan===b.plan&&u.tariffPreference?.tariffRevision===tariffRevision(s))return {saved:true,plan:b.plan,activated:false};
 const id=crypto.randomUUID();u.tariffVersion++;
 u.tariffPreference={id,plan:b.plan,selectedAt:now,price:plan.price,limit:plan.limit,tariffRevision:tariffRevision(s),currency:'KZT',months:1};
 u.tariffHistory.push({id:crypto.randomUUID(),sequence:u.tariffVersion,type:'selected',time:now,selectionId:id,plan:b.plan,price:plan.price,limit:plan.limit,tariffRevision:tariffRevision(s),currency:'KZT',months:1});
 return {saved:true,plan:b.plan,activated:false};
}
export function trialReminders(s,now){
 let changed=false;
 for(const u of Object.values(s.profiles)){
  const trial=u.launchTrial;if(!trial||now<trial.startsAt)continue;
  const expired=now>=trial.endsAt,kind=expired?'expired':'ending';
  if(!expired&&now<trial.endsAt-3*DAY||trial[kind+'NotifiedAt'])continue;
  trial[kind+'NotifiedAt']=now;
  s.notifications.unshift({id:crypto.randomUUID(),users:[u.id],target:'tariffs',text:expired?'Бесплатный месяц завершён. Выберите тариф для продолжения продаж. Автоматических списаний нет.':'Бесплатный месяц скоро завершится. Выберите тариф заранее. Автоматических списаний нет.',time:now});changed=true;
 }
 return changed;
}
