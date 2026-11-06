'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,UsersRound} from 'lucide-react';
import Flower from '../../lib/maxiflora/Flower';
import {catalogGroups} from '../../lib/maxiflora/catalog.mjs';
type Row=Record<string,any>;
const ruCount=(n:number,one:string,few:string,many:string)=>n%100>=11&&n%100<=14?many:n%10===1?one:n%10>=2&&n%10<=4?few:many;
const money=(n:number)=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n)+' ₸';
export default function CatalogGroups({products,allOffers=products,renderOffer,lang,remote,onPage,onLimit}:{products:Row[];allOffers?:Row[];renderOffer:(p:Row)=>React.ReactNode;lang:string;remote?:Row;onPage?:(n:number)=>void;onLimit?:(n:number)=>void}){
 const [limit,setLimit]=useState(24),[page,setPage]=useState(0),[selected,setSelected]=useState('');
 const detailRef=useRef<HTMLElement>(null),t=(r:string,k:string)=>lang==='ru'?r:k;
 const rows:Row[]=remote?.rows||catalogGroups(products,allOffers),max=remote?.pages||Math.max(1,Math.ceil(rows.length/limit)),current=remote?remote.page-1:Math.min(page,max-1),chosen=rows.find(row=>row.id===selected);
 useEffect(()=>{if(chosen){detailRef.current?.focus({preventScroll:true});detailRef.current?.scrollIntoView({block:'start'})}},[selected]);
 if(chosen){const p=chosen.product;return <section className="catalog-product-detail" tabIndex={-1} ref={detailRef} aria-label={p.name}>
  <button className="backlink catalog-back" onClick={()=>setSelected('')}><ArrowLeft size={17}/>{t('К списку цветов','Гүлдер тізіміне')}</button>
  <div className="catalog-detail-summary"><div className="catalog-detail-art"><Flower kind={p.kind} color={p.color} id={'detail-'+p.id}/></div><div><span className="eyebrow">{p.city} · {p.categoryLabels?.[lang]||p.categoryLabels?.ru||p.category}</span><h2>{p.name}</h2><p>{p.origin} · {p.height} {t('см','см')}</p>{chosen.minPrice!==null&&<strong>{t('от ','бастап ')}{money(chosen.minPrice)} <small>/ {t('шт.','дана')}</small></strong>}<p className="catalog-detail-help">{t('Выберите предложение поставщика. Фасовка, цена и условия указаны отдельно для каждого варианта.','Жеткізушінің ұсынысын таңдаңыз. Әр нұсқаның қаптамасы, бағасы және шарттары бөлек көрсетілген.')}</p></div></div>
  <div className="sectiontitle"><h2>{t('Предложения поставщиков','Жеткізушілердің ұсыныстары')}</h2><small>{chosen.offers.length} {t(ruCount(chosen.offers.length,'предложение','предложения','предложений'),'ұсыныс')}</small></div>
  <div className="catalog-seller-offers">{chosen.offers.map(renderOffer)}</div>
 </section>}
 return <><div className="catalog-page-control"><span>{t('Товаров: ','Тауарлар: ')}{remote?.total??rows.length}</span><label>{t('На странице','Бетте')}<select aria-label={t('Товаров на странице','Беттегі тауарлар')} value={remote?.limit||limit} onChange={e=>{setLimit(Number(e.target.value));setPage(0);onLimit?.(Number(e.target.value))}}>{[24,48,96].map(n=><option key={n}>{n}</option>)}</select></label></div>
  <div className="productgrid catalog-tiles">{(remote?rows:rows.slice(current*limit,(current+1)*limit)).map(row=>{const p=row.product;return <button className="catalog-tile" key={row.id} onClick={()=>setSelected(row.id)} aria-label={t('Выбрать поставщика: ','Жеткізушіні таңдау: ')+p.name} title={t('Открыть карточку цветка со всеми предложениями поставщиков в этом городе','Осы қаладағы барлық жеткізуші ұсыныстары бар гүл карточкасын ашу')}>
   <span className="catalog-tile-art"><Flower kind={p.kind} color={p.color} id={'tile-'+p.id}/><span className={'productavailability '+(p.transit?'transit':'')}>{p.transit?t('В пути','Жолда'):row.minPrice===null?t('Нет в наличии','Қоймада жоқ'):<><i/>{t('В наличии','Қоймада')}</>}</span></span>
   <span className="catalog-tile-body"><strong className="catalog-tile-title">{p.name}</strong><span className="catalog-tile-specs">{p.origin} · {p.height} {t('см','см')}</span><span className="catalog-tile-price">{row.minPrice===null?t('Уточните наличие','Бар-жоғын нақтылаңыз'):<>{t('от ','бастап ')}{money(row.minPrice)} <small>/ {t('шт.','дана')}</small></>}</span><span className="catalog-tile-count"><UsersRound size={13}/>{row.suppliers} {t(ruCount(row.suppliers,'поставщик','поставщика','поставщиков'),'жеткізуші')} · {row.offers.length} {t(ruCount(row.offers.length,'предложение','предложения','предложений'),'ұсыныс')}</span><span className="catalog-tile-open">{t('Выбрать предложение','Ұсынысты таңдау')}<ArrowRight size={16}/></span></span>
  </button>})}</div>{max>1&&<nav className="catalog-pagination" aria-label={t('Страницы каталога','Каталог беттері')}><button className="btn secondary" disabled={current===0} onClick={()=>{setPage(current-1);onPage?.(current)}}>{t('Назад','Артқа')}</button><span>{current+1} / {max}</span><button className="btn secondary" disabled={current===max-1} onClick={()=>{setPage(current+1);onPage?.(current+2)}}>{t('Далее','Келесі')}</button></nav>}</>;
}
