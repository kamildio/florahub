'use client';
import type {ReactNode} from 'react';
import {MapPin,Search,UserRound} from 'lucide-react';
type Props={accountMenu?:ReactNode;city:string;cities:string[];lang:string;signedIn:boolean;onCity:(city:string)=>void;onLang:()=>void;onHome:()=>void;onAccount:()=>void;onSearch:(query:string)=>void};
export default function HomeHeader({city,cities,lang,signedIn,onCity,onLang,onHome,onAccount,onSearch,accountMenu}:Props){
 const t=(ru:string,kk:string)=>lang==='ru'?ru:kk;
 return <header className="home-header">
  <button className="home-brand" onClick={onHome} aria-label="MaXiFlora — главная"><span>MaXi</span>Flora.kz</button>
  <label className="home-city"><MapPin size={16}/><select aria-label={t('Город каталога','Каталог қаласы')} value={city} onChange={e=>onCity(e.target.value)}>{cities.map(c=><option key={c}>{c}</option>)}</select></label>
  <form className="home-search" role="search" onSubmit={e=>{e.preventDefault();onSearch(String(new FormData(e.currentTarget).get('q')||'').trim())}}>
   <button type="submit" aria-label={t('Найти цветы и поставщиков','Гүлдер мен жеткізушілерді табу')} title={t('Открыть каталог с результатами поиска','Іздеу нәтижелері бар каталогты ашу')}><Search size={18}/></button>
   <input name="q" type="search" aria-label={t('Поиск по цветам и поставщикам','Гүлдер мен жеткізушілер бойынша іздеу')} placeholder={t('Поиск по цветам и поставщикам…','Гүлдер мен жеткізушілерді іздеу…')}/>
  </form>
  <button className="home-language" onClick={onLang} title={t('Сменить язык на казахский','Тілді орыс тіліне ауыстыру')}>{lang.toUpperCase()}</button>
  {accountMenu||<button className="home-account" onClick={onAccount} aria-label={t(signedIn?'Ваш кабинет':'Войти в аккаунт',signedIn?'Жеке кабинетіңіз':'Аккаунтқа кіру')} title={t(signedIn?'Открыть ваш кабинет':'Открыть вход или регистрацию',signedIn?'Жеке кабинетіңізді ашу':'Кіруді немесе тіркелуді ашу')}><UserRound size={20}/><span>{t(signedIn?'Кабинет':'Войти',signedIn?'Кабинет':'Кіру')}</span></button>}
 </header>;
}
