'use client';
import {useState} from 'react';
import {ArrowRight,Clock3,ShieldCheck,History,RefreshCw} from 'lucide-react';
import {campaignMoment} from './LaunchOffer';
type Row=Record<string,any>;
const price=(value:number)=>new Intl.NumberFormat('ru-RU').format(value)+' ₸';
export default function TariffAccount({subscription,lang,onOpen,onClear,busy=false,compact=false}:{subscription?:Row;lang:string;onOpen?:()=>void;onClear?:()=>void;busy?:boolean;compact?:boolean}){
 const t=(ru:string,kk:string)=>lang==='ru'?ru:kk;
 if(!subscription)return null;
 const {trial,activePlan,preference,confirmedPreference}=subscription,free=trial?.status==='active'&&activePlan===trial.plan&&subscription.planUntil===trial.endsAt;
 return <section className={"tariff-account"+(compact?" tariff-account-compact":"")} aria-label={t('Ваш тариф и выбор','Тарифіңіз бен таңдауыңыз')}>
  <div className="tariff-access"><div className="tariff-panel-label"><ShieldCheck size={19}/>{t('Действующий доступ','Қолданыстағы қолжетімділік')}</div><h2>{activePlan||t('Тариф для продаж не подключён','Сату тарифі қосылмаған')}</h2>
   {activePlan?<><span className={'tag '+(free?'':'gray')}>{free?t('Бесплатный месяц','Тегін ай'):t('Активен','Белсенді')}</span><p>{t('Действует до ','Мерзімі: ')}{campaignMoment(subscription.planUntil,lang)}</p><small>{t('Лимит активных карточек: ','Белсенді карточкалар шектеуі: ')}{subscription.activeOfferLimit??'∞'}</small>{free&&<small>{t('Осталось дней: ','Қалған күн: ')}{trial.daysLeft}</small>}</>:<p>{subscription.pendingTrial?t('Бесплатный MAX начнётся после одобрения профиля компании.','Тегін MAX компания профилі мақұлданғаннан кейін басталады.'):trial?t('Бесплатный месяц завершён. Новые продажи откроются после подключения тарифа.','Тегін ай аяқталды. Жаңа сатылымдар тариф қосылғаннан кейін ашылады.'):t('Вы можете выбирать цветы, вести переписку и готовить профиль поставщика.','Гүл таңдап, хат алмасып, жеткізуші профилін дайындай аласыз.')}</p>}
   <small>{t('История и работа с текущими заказами сохраняются.','Тарих пен ағымдағы тапсырыстармен жұмыс сақталады.')}</small>
  </div>
  <div className="tariff-preference"><div className="tariff-panel-label"><Clock3 size={19}/>{confirmedPreference?t('Оплаченный период','Төленген кезең'):t('Предварительный выбор','Алдын ала таңдау')}</div><h2>{preference?.plan||t('Пока не выбран','Әзірге таңдалмаған')}</h2>
   {confirmedPreference&&<p>{campaignMoment(confirmedPreference.startsAt,lang)} — {campaignMoment(confirmedPreference.endsAt,lang)}</p>}{preference?<><span className="tag gray">{confirmedPreference?(confirmedPreference.startsAt>Date.now()?t('Начнётся после текущего доступа','Ағымдағы қолжетімділіктен кейін басталады'):t('Оплата подтверждена','Төлем расталды')):t('Не оплачен','Төленбеген')}</span><p>{preference.price===null?t('Цена при выборе не фиксировалась','Таңдау кезінде баға тіркелмеген'):price(preference.price)+' / '+t('мес. на момент выбора','таңдау сәтіндегі айлық баға')}</p><small>{t('Сохранён: ','Сақталған: ')}{campaignMoment(preference.selectedAt,lang)}</small></>:<p>{t('Сравните Start, Business и MAX. Выбор можно изменить или отменить.','Start, Business және MAX тарифтерін салыстырыңыз. Таңдауды өзгертуге не жоюға болады.')}</p>}
   {onOpen&&<button className="btn secondary" onClick={onOpen}>{t('Открыть тарифы','Тарифтерді ашу')}<ArrowRight size={15}/></button>}
   {preference&&!confirmedPreference&&onClear&&<button className="tariff-clear" disabled={busy} onClick={onClear}>{t('Отменить предварительный выбор','Алдын ала таңдауды жою')}</button>}
  </div>
  <p className="tariff-account-footnote">{t('Выбор не является оплатой или подключением тарифа. Бесплатный срок не меняется. Автоматических списаний нет.','Таңдау төлем не тариф қосу болып саналмайды. Тегін мерзім өзгермейді. Автоматты төлем алынбайды.')}</p>
 </section>;
}
export function TariffHistory({subscription,lang,request,onRefresh}:{subscription:Row;lang:string;request:(path:string)=>Promise<Row>;onRefresh:()=>Promise<any>}){
 const initial=subscription.history||{items:[],total:0,nextBefore:null,version:0};
 const [items,setItems]=useState<Row[]>(initial.items),[next,setNext]=useState<number|null>(initial.nextBefore),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const t=(ru:string,kk:string)=>lang==='ru'?ru:kk;
 async function more(){if(loading||next===null)return;setLoading(true);setError('');try{const page=await request('tariff-history?before='+next);if(page.version!==initial.version)throw new Error(t('История обновилась на другом устройстве. Обновите данные.','Тарих басқа құрылғыда жаңартылды. Деректерді жаңартыңыз.'));setItems(old=>[...old,...page.items]);setNext(page.nextBefore)}catch(e){setError((e as Error).message)}finally{setLoading(false)}}
 async function refresh(){setLoading(true);try{await onRefresh();setError('')}catch(e){setError((e as Error).message)}finally{setLoading(false)}}
 return <section className="tariff-history" aria-labelledby="tariff-history-title"><div className="sectiontitle"><h2 id="tariff-history-title"><History size={20}/>{t('История выбора','Таңдау тарихы')}</h2><small>{items.length} / {initial.total}</small></div>
  {!items.length?<p className="subheading">{t('Здесь появятся ваши выборы и отмены тарифов. Они не подтверждают оплату.','Мұнда тариф таңдаулары мен оларды жою тарихы көрсетіледі. Олар төлемді растамайды.')}</p>:<ol>{items.map(item=><li key={item.id}><span className={'tariff-history-marker '+(item.type==='cleared'?'cleared':'')}/><div><b>{item.type==='cleared'?t('Выбор отменён: ','Таңдау жойылды: '):t('Выбран ','Таңдалған: ')}{item.plan}</b><small>{campaignMoment(item.time,lang)}</small><p>{item.legacy?t('Цена при исходном выборе не фиксировалась.','Бастапқы таңдау кезінде баға тіркелмеген.'):price(item.price)+' / '+t('мес. на момент выбора','таңдау сәтіндегі айлық баға')}</p></div>{item.type==='selected'&&subscription.preference?.id===item.selectionId&&<span className="tag gray">{t('Текущий выбор','Ағымдағы таңдау')}</span>}</li>)}</ol>}
  {error&&<div role="alert" className="note error">{error}<button className="btn secondary small" disabled={loading} onClick={refresh}><RefreshCw size={14}/>{t('Обновить данные','Деректерді жаңарту')}</button></div>}
  {next!==null&&<button className="btn secondary" disabled={loading} onClick={more}>{loading?t('Загружаем…','Жүктелуде…'):t('Показать ещё','Тағы көрсету')}</button>}
 </section>;
}
