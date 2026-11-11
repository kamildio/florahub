'use client';
import {Gift,ArrowRight,CheckCircle2,Clock3} from 'lucide-react';
type Row=Record<string,any>;
const kkMonths=['қаңтар','ақпан','наурыз','сәуір','мамыр','маусым','шілде','тамыз','қыркүйек','қазан','қараша','желтоқсан'];
const day=(time:number,lang:string)=>{if(lang==='ru')return new Intl.DateTimeFormat('ru-RU',{timeZone:'Asia/Almaty',day:'numeric',month:'long',year:'numeric'}).format(time);const d=new Date(time+5*3600000);return `${d.getUTCFullYear()} жылғы ${d.getUTCDate()} ${kkMonths[d.getUTCMonth()]}`};
const moment=(time:number,lang:string)=>{const d=new Date(time+5*3600000);return day(time,lang)+', '+String(d.getUTCHours()).padStart(2,'0')+':'+String(d.getUTCMinutes()).padStart(2,'0')};
export function LaunchOffer({campaign,lang,signedIn,onOpen,compact=false,mascot=true}:{campaign?:Row;lang:string;signedIn:boolean;onOpen?:()=>void;compact?:boolean;mascot?:boolean}){
 const t=(ru:string,kk:string)=>lang==='ru'?ru:kk;
 if(campaign?.status!=='active')return null;
 return <section className={'launch-offer '+(compact?'compact':'')} aria-label={t('Акция для первых клиентов','Алғашқы клиенттерге арналған акция')}>
  <span className={'launch-icon '+(mascot?'launch-fox':'')}>{mascot?<img src="/images/maxiflora-fox-launch.png" alt={t('Лисёнок MaXiFlora с букетом','Гүл шоғы бар MaXiFlora түлкісі')} width="1600" height="640"/>:<Gift size={compact?22:28}/>}</span><div className="launch-copy"><span className="eyebrow">{t('Для первых клиентов','Алғашқы клиенттерге')}</span><h2>{t('Первый месяц — бесплатно','Бірінші ай — тегін')}</h2><p>{t('Месяц MAX за 0 ₸ после одобрения профиля компании. Затем — тариф на ваш выбор, без автоматических списаний.','Компания профилі мақұлданғаннан кейін MAX тарифі бір айға 0 ₸. Содан кейін тарифті өзіңіз таңдайсыз, автоматты төлем алынбайды.')}</p><small>{t('Регистрация по акции: ','Акция бойынша тіркелу: ')}{day(campaign.startsAt,lang)} — {day(campaign.endsAt-1,lang)} {t('включительно · время Астаны','қоса алғанда · Астана уақыты')}</small></div>
  {onOpen&&<button className="btn" onClick={onOpen}>{t(signedIn?'Условия акции':'Начать бесплатно',signedIn?'Акция шарттары':'Тегін бастау')}<ArrowRight size={17}/></button>}
 </section>;
}
export function SubscriptionStatus({subscription,lang,onOpen}:{subscription?:Row;lang:string;onOpen:()=>void}){
 const t=(ru:string,kk:string)=>lang==='ru'?ru:kk,trial=subscription?.trial;
 if(!trial)return null;
 const active=trial.status==='active';
 return <section className={'trial-status '+(!active?'expired':'')} aria-label={t('Ваш бесплатный месяц','Сіздің тегін айыңыз')}>
  {active?<CheckCircle2 size={24}/>:<Clock3 size={24}/>}<div><h2>{active?t('Ваш бесплатный месяц ','Сіздің тегін айыңыз: ')+trial.plan:t('Бесплатный месяц завершён','Тегін ай аяқталды')}</h2><p>{active?t('Действует до ','Мерзімі: ')+moment(trial.endsAt,lang)+' · '+t('осталось дней: ','қалған күн: ')+trial.daysLeft:t('Выберите тариф для продолжения продаж. История и текущие заказы сохраняются.','Сатуды жалғастыру үшін тариф таңдаңыз. Тарих пен ағымдағы тапсырыстар сақталады.')}</p><small>{t('Автоматических списаний нет.','Автоматты төлем алынбайды.')}{subscription?.preference&&' '+t('Ваш выбор: ','Таңдауыңыз: ')+subscription.preference.plan}</small></div><button className="btn secondary" onClick={onOpen}>{t('Выбрать тариф','Тариф таңдау')}<ArrowRight size={16}/></button>
 </section>;
}
export {day as campaignDate,moment as campaignMoment};
