'use client';
import {ArrowRight,UsersRound,ShoppingCart,Tag} from 'lucide-react';
import BannerCarousel,{type BannerSlide} from './BannerCarousel';
import {copyText} from '../../lib/maxiflora/site-copy.mjs';
import {homeSlides} from './home-slides';

type Props={onSupplier?:(id:string)=>void;siteCopy?:Record<string,any>;banners:Record<string,any>[];onNews:(item:Record<string,any>)=>void;campaign?:Record<string,any>;lang:string;signedIn:boolean;onRole:(supplier:boolean)=>void;onTariffs:()=>void;onCatalog:()=>void;onBoard:()=>void};
export default function HomeLanding({siteCopy,banners,onNews,campaign,lang,signedIn,onRole,onTariffs,onCatalog,onBoard,onSupplier}:Props){
 const t=(ru:string,kk:string)=>lang==='ru'?ru:kk;
 const copy=(id:string)=>copyText(siteCopy,id,lang);
 const slides:BannerSlide[]=[
  {id:'flowers-for-business',desktop:'/images/florist-roses-v2.webp',mobile:'/images/florist-roses-v2.webp',alt:'',title:copy('heroTitle'),description:copy('heroDescription'),cta:copy('heroButton'),onOpen:onCatalog,actionLabel:t('Открыть каталог цветов в выбранном городе','Таңдалған қаладағы гүлдер каталогын ашу')},
  {id:'maxiflora-max',desktop:'/images/florist-crates-v2.webp',mobile:'/images/florist-crates-v2.webp',alt:'',eyebrow:'MaXiFlora MAX',title:copy('maxTitle'),description:copy('maxDescription'),cta:copy('maxButton'),onOpen:onTariffs,actionLabel:t('Посмотреть возможности тарифа MAX','MAX тарифінің мүмкіндіктерін көру')}
 ];
 slides.unshift(...homeSlides(banners,lang,id=>{if(id.startsWith('supplier:'))onSupplier?.(id.slice(9));else if(id==='catalog')onCatalog();else if(id==='board')onBoard();else if(id==='supplier')onRole(true);else onTariffs();},onNews));
 if(campaign?.status==='active'&&lang!=='ru')slides.unshift({id:'first-clients-kk',desktop:'/images/florist-roses-v2.webp',mobile:'/images/florist-roses-v2.webp',alt:'',eyebrow:'Алғашқы клиенттерге',title:'Бірінші ай —\nтегін',description:'Тіркелген күннен бастап MAX тарифі бір айға 0 ₸',cta:signedIn?'Акция шарттары':'Тегін бастау',onOpen:signedIn?onTariffs:()=>onRole(false),actionLabel:'Тегін MAX айының шарттарын көру'});
 if(campaign?.status==='active'&&lang==='ru')slides.unshift({id:'first-clients-fox',desktop:'/images/maxiflora-fox-launch-v2.webp',mobile:'/images/maxiflora-fox-bouquet-v2.webp',alt:'Лисёнок MaXiFlora с букетом. Для первых клиентов — первый месяц бесплатно.',mobileCopy:{eyebrow:'Для первых клиентов',title:'Первый месяц\nбесплатно',description:'Месяц MAX за 0 ₸'},artwork:true,cta:signedIn?'Условия акции':'Начать бесплатно',onOpen:signedIn?onTariffs:()=>onRole(false),actionLabel:signedIn?'Посмотреть условия бесплатного месяца MAX':'Зарегистрироваться и получить бесплатный месяц MAX'});
 return <div className="home-landing">
  <h1 className="sr-only">{t('MaXiFlora — цветы объединяют бизнес','MaXiFlora — гүлдер бизнесті біріктіреді')}</h1>
  <BannerCarousel key={lang} slides={slides} lang={lang}/>
  <nav className="home-destinations" aria-label={t('Основные разделы','Негізгі бөлімдер')}>
   {[{title:copy('catalogTitle'),text:copy('catalogDescription'),image:'/images/florist-roses-v2.webp',open:onCatalog}, {title:copy('boardTitle'),text:copy('boardDescription'),image:'/images/florist-crates-v2.webp',open:onBoard}].map(card=><button className="home-destination" key={card.title} onClick={card.open} title={card.title}><img src={card.image} alt="" width="220" height="180"/><span className="home-destination-copy"><strong>{card.title}</strong><span>{card.text}</span></span><span className="home-destination-arrow"><ArrowRight size={20}/></span></button>)}
  </nav>
  <section className="home-benefits" aria-labelledby="home-benefits-title">
   <h2 id="home-benefits-title">{copy('benefitsTitle')}</h2>
   <div className="home-benefit-grid">{[
    [UsersRound,copy('supplierBenefitTitle'),copy('supplierBenefitText')],
    [ShoppingCart,copy('ordersBenefitTitle'),copy('ordersBenefitText')],
    [Tag,copy('wholesaleBenefitTitle'),copy('wholesaleBenefitText')]
   ].map(([Icon,title,text]:any,i)=><article className="home-benefit" key={i}><span className="home-benefit-icon"><Icon size={29}/></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div>
  </section>
  <section className="home-supplier-invite" aria-labelledby="home-supplier-title"><div><h2 id="home-supplier-title">{copy('supplierTitle')}</h2><p>{copy('supplierText')}</p></div><img className="home-supplier-fox" src="/images/maxiflora-fox-launch.png" alt="" width="1600" height="640"/><button className="btn" onClick={()=>onRole(true)} title={t(signedIn?'Открыть кабинет поставщика или подготовить профиль для продаж':'Открыть регистрацию поставщика',signedIn?'Жеткізуші кабинетін ашу немесе сату профилін дайындау':'Жеткізуші ретінде тіркелуді ашу')}>{copy('supplierButton')}<ArrowRight size={18}/></button></section>
 </div>;
}
