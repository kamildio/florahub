'use client';
import {useState} from 'react';
import KazakhstanPhone from './KazakhstanPhone';
import {ArrowRight,Eye,EyeOff,MessageCircle,LockKeyhole} from 'lucide-react';

export default function LoginWidget({lang,busy,onSubmit,onRegister,onCode,onReset,whatsappReady=false,emailMode=false,emailReady=false,onEmail}:{onEmail?:()=>void;emailMode?:boolean;emailReady?:boolean;whatsappReady?:boolean;lang:string;busy:boolean;onSubmit:(event:React.FormEvent<HTMLFormElement>)=>void;onRegister:()=>void;onCode:()=>void;onReset:()=>void;}){
 const [visible,setVisible]=useState(false);
 const t=(ru:string,kk:string)=>lang==='ru'?ru:kk;
 return <div className="login-widget">
  <p className="login-welcome">{t('Добро пожаловать','Қош келдіңіз')}</p>
  <p className="login-subtitle">{t('Один аккаунт для покупок и продаж','Сатып алу мен сату үшін бір аккаунт')}</p>
  <button type="button" disabled={emailMode&&!emailReady} className={'btn login-submit'+(emailMode||whatsappReady?'':' ghost')} onClick={onCode}>{emailMode?t('Войти по коду из письма','Поштадағы кодпен кіру'):whatsappReady?t('Войти по коду в WhatsApp','WhatsApp кодымен кіру'):t('Войти по коду из письма','Поштадағы кодпен кіру')}</button>
  {!emailMode&&emailReady&&<button type="button" className="btn login-submit" onClick={onEmail}>{t('Войти по коду из письма','Поштадағы кодпен кіру')}</button>}
  <form onSubmit={onSubmit}>
   <div className="field"><label htmlFor="login-phone">{t('Номер телефона','Телефон нөмірі')}</label><KazakhstanPhone id="login-phone" required/></div>
   <div className="field"><label htmlFor="login-password">{t('Пароль','Құпиясөз')}</label><div className="login-password"><input id="login-password" name="password" type={visible?'text':'password'} autoComplete="current-password" placeholder={t('Введите пароль','Құпиясөзді енгізіңіз')} required minLength={8} maxLength={128}/><button type="button" aria-label={visible?t('Скрыть пароль','Құпиясөзді жасыру'):t('Показать пароль','Құпиясөзді көрсету')} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={20}/>:<Eye size={20}/>}</button></div></div>
   <button className="btn login-submit" disabled={busy}>{busy?t('Входим…','Кіруде…'):t('Войти','Кіру')}<ArrowRight size={18}/></button>
  </form>
  <p className="login-register"><button type="button" disabled={emailMode&&!emailReady} onClick={onReset}>{t('Забыли пароль?','Құпиясөзді ұмыттыңыз ба?')}</button></p>
  <p className="login-register">{t('Нет аккаунта?','Аккаунтыңыз жоқ па?')} <button type="button" onClick={onRegister}>{t('Регистрация','Тіркелу')}</button></p>
 </div>;
}
