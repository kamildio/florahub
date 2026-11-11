'use client';
import {useState} from 'react';
import {marketingChoice,PRIVACY_VERSION} from '../../lib/maxiflora/privacy-policy.mjs';
type Row=Record<string,any>;
export default function PrivacySettings({profile,lang,action,onRefresh,onSupport}:{profile:Row;lang:string;action:(body:Row)=>Promise<Row>;onRefresh:()=>Promise<any>;onSupport:()=>void}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[confirm,setConfirm]=useState(false),[reason,setReason]=useState(''),[requestId,setRequestId]=useState(''),[ticket,setTicket]=useState<number|null>(null);
 const t=(ru:string,kk:string)=>lang==='ru'?ru:kk;
 const selected=profile.marketingConsent?.enabled===true&&profile.marketingConsent?.version===PRIVACY_VERSION;
 async function toggle(enabled:boolean){
  if(busy)return;setBusy(true);setMessage('');
  try{await action({action:'privacy-marketing',enabled});await onRefresh();setMessage(enabled?t('Сообщения об акциях включены.','Акциялар туралы хабарламалар қосылды.'):t('Сообщения об акциях отключены.','Акциялар туралы хабарламалар өшірілді.'))}
  catch(e){setMessage((e as Error).message)}finally{setBusy(false)}
 }
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;setBusy(true);setMessage('');
  try{
   const result=await action({action:'privacy-delete-request',operationId:requestId,reason});
   setTicket(result.number);setConfirm(false);await onRefresh();
  }catch(e){setMessage((e as Error).message)}finally{setBusy(false)}
 }
 return <section className="card privacy-settings" id="privacy-settings" aria-labelledby="privacy-settings-title">
  <h2 id="privacy-settings-title">{t('Конфиденциальность','Құпиялылық')}</h2>
  <p><a href="/legal/privacy" target="_blank" rel="noopener noreferrer">{t('Согласие на обработку данных','Деректерді өңдеуге келісім')}</a></p>
  <label className="check"><input type="checkbox" checked={selected} disabled={busy} onChange={e=>toggle(e.target.checked)}/><span>{marketingChoice}</span></label>
  <h3>{t('Удаление аккаунта','Аккаунтты жою')}</h3>
  <p>{t('Отправьте запрос прямо из кабинета. Он появится у администратора в обращениях; уведомление также поступит на рабочую почту. Оператор ответит в течение 15 рабочих дней.','Сұрауды кабинеттен жіберіңіз. Ол әкімші өтініштерінде пайда болады және жұмыс поштасына хабарлама жіберіледі. Оператор 15 жұмыс күні ішінде жауап береді.')}</p>
  <small>{t('Перед удалением оператор проверит открытые заказы и обязательства. Документы, которые необходимо хранить по закону, сохраняются в необходимом объёме.','Жою алдында оператор ашық тапсырыстар мен міндеттемелерді тексереді. Заң бойынша сақтау қажет құжаттар қажетті көлемде сақталады.')}</small>
  {ticket&&<div className="note" role="status">{t('Запрос зарегистрирован, № ','Сұрау тіркелді, № ')}{ticket}. <button type="button" className="btn ghost small" onClick={onSupport}>{t('Открыть обращения','Өтініштерді ашу')}</button></div>}
  {message&&<p role="status" className="note">{message}</p>}
  {confirm?<form onSubmit={submit} className="operations-form">
   <p>{t('Подтвердите отправку запроса на удаление аккаунта.','Аккаунтты жою сұрауын жіберуді растаңыз.')}</p>
   <label className="field">{t('Комментарий · необязательно','Түсініктеме · міндетті емес')}<textarea value={reason} onChange={e=>setReason(e.target.value)} maxLength={2000} disabled={busy}/></label>
   <div className="btnrow"><button className="btn" disabled={busy}>{busy?t('Отправляем…','Жіберілуде…'):t('Отправить запрос','Сұрау жіберу')}</button><button className="btn secondary" type="button" disabled={busy} onClick={()=>setConfirm(false)}>{t('Отмена','Болдырмау')}</button></div>
  </form>:<p><button className="btn secondary" type="button" disabled={busy||ticket!==null} onClick={()=>{setRequestId(crypto.randomUUID());setConfirm(true);setMessage('')}}>{t('Удалить аккаунт','Аккаунтты жою')}</button></p>}
 </section>;
}
