'use client';
import {useState} from 'react';
import KazakhstanPhone from './KazakhstanPhone';
import {telegramReturnNotice} from '../../lib/maxiflora/telegram-feedback.mjs';
import {ArrowRight,Eye,EyeOff,MessageCircle,LockKeyhole} from 'lucide-react';

export default function LoginWidget({lang,busy,onSubmit,onRegister,onCode,onReset,telegramReady,onTelegram,callbackStatus,whatsappReady=false,emailMode=false,emailReady=false,onEmail}:{onEmail?:()=>void;emailMode?:boolean;emailReady?:boolean;whatsappReady?:boolean;callbackStatus?:string;lang:string;busy:boolean;onSubmit:(event:React.FormEvent<HTMLFormElement>)=>void;onRegister:()=>void;onCode:()=>void;onReset:()=>void;telegramReady:boolean;onTelegram:()=>void}){
 const [method,setMethod]=useState<'password'|'telegram'>('password');
 const [visible,setVisible]=useState(false);
 const t=(ru:string,kk:string)=>lang==='ru'?ru:kk;
 return <div className="login-widget">
  {telegramReturnNotice(callbackStatus,lang)&&<div className="note error" role="alert">{telegramReturnNotice(callbackStatus,lang)}</div>}
  <p className="login-welcome">{t('Добро пожаловать','Қош келдіңіз')}</p>
  <p className="login-subtitle">{t('Один аккаунт для покупок и продаж','Сатып алу мен сату үшін бір аккаунт')}</p>
  {!emailMode&&<div className="login-methods" role="group" aria-label={t('Способ входа','Кіру тәсілі')}>
   <button type="button" aria-pressed={method==='password'} onClick={()=>setMethod('password')}><LockKeyhole size={18}/>{t('По паролю','Құпиясөзбен')}</button>
   <button type="button" aria-pressed={method==='telegram'} onClick={()=>setMethod('telegram')}><MessageCircle size={18}/>{t('Быстрый вход · бот','Жылдам кіру · бот')}</button>
  </div>}
  <button type="button" disabled={emailMode&&!emailReady} className={'btn login-submit'+(emailMode||whatsappReady?'':' ghost')} onClick={onCode}>{emailMode?t('Войти по коду из письма','Поштадағы кодпен кіру'):whatsappReady?t('Войти по коду в WhatsApp','WhatsApp кодымен кіру'):t('Войти по коду в Telegram','Telegram кодымен кіру')}</button>
  {!emailMode&&emailReady&&<button type="button" className="btn login-submit" onClick={onEmail}>{t('Войти по коду из письма','Поштадағы кодпен кіру')}</button>}
  <form onSubmit={onSubmit} hidden={method!=='password'}>
   <div className="field"><label htmlFor="login-phone">{t('Номер телефона','Телефон нөмірі')}</label><KazakhstanPhone id="login-phone" required/></div>
   <div className="field"><label htmlFor="login-password">{t('Пароль','Құпиясөз')}</label><div className="login-password"><input id="login-password" name="password" type={visible?'text':'password'} autoComplete="current-password" placeholder={t('Введите пароль','Құпиясөзді енгізіңіз')} required minLength={8} maxLength={128}/><button type="button" aria-label={visible?t('Скрыть пароль','Құпиясөзді жасыру'):t('Показать пароль','Құпиясөзді көрсету')} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={20}/>:<Eye size={20}/>}</button></div></div>
   <button className="btn login-submit" disabled={busy}>{busy?t('Входим…','Кіруде…'):t('Войти','Кіру')}<ArrowRight size={18}/></button>
  </form>
  {method==='telegram'&&<div className="login-telegram" role="status"><MessageCircle size={30}/><h3>{telegramReady?t('Вход через Telegram','Telegram арқылы кіру'):t('Вход через Telegram готовится','Telegram арқылы кіру дайындалуда')}</h3><p>{telegramReady?t('Сначала привяжите Telegram в своём кабинете после входа по паролю или коду. При быстром входе откройте уведомление Telegram, подтвердите запрос MaXiFlora и вернитесь в браузер. Просто открыть бота недостаточно.','Telegram арқылы жалғастырыңыз. Алғашқы кіру үшін кабинетте Telegram-ды аккаунтыңызға байланыстырыңыз.'):t('После подключения вы сможете подтверждать вход в Telegram. Пока используйте телефон и пароль.','Қосылғаннан кейін кіруді Telegram арқылы растай аласыз. Әзірге телефон мен құпиясөзді пайдаланыңыз.')}</p>{telegramReady&&<button type="button" className="btn login-submit" disabled={busy} onClick={onTelegram}>{t('Продолжить в Telegram','Telegram арқылы жалғастыру')}<ArrowRight size={18}/></button>}<button type="button" className="btn ghost login-submit" onClick={()=>setMethod('password')}>{t('Войти по паролю','Құпиясөзбен кіру')}</button></div>}
  <p className="login-register"><button type="button" disabled={emailMode&&!emailReady} onClick={onReset}>{t('Забыли пароль?','Құпиясөзді ұмыттыңыз ба?')}</button></p>
  <p className="login-register">{t('Нет аккаунта?','Аккаунтыңыз жоқ па?')} <button type="button" onClick={onRegister}>{t('Регистрация','Тіркелу')}</button></p>
 </div>;
}
