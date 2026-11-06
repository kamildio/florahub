'use client';
import {useEffect,useRef,useState} from 'react';
import {ChevronRight} from 'lucide-react';

export type BannerSlide={id:string;desktop:string;mobile:string;alt:string;onOpen?:()=>void;actionLabel?:string;eyebrow?:string;title?:string;description?:string;cta?:string;artwork?:boolean;mobileCopy?:{eyebrow:string;title:string;description:string}};

/** The list is deliberately uncapped; navigation uses its current length. */
export default function BannerCarousel({slides,lang}:{slides:BannerSlide[];lang:string}){
 const [index,setIndex]=useState(0),[paused,setPaused]=useState(false),[hover,setHover]=useState(false),[focused,setFocused]=useState(false),[hidden,setHidden]=useState(false);
 const touch=useRef<{x:number;y:number}|null>(null),swiped=useRef(false);
 const t=(ru:string,kk:string)=>lang==='ru'?ru:kk;
 const count=slides.length,current=count?index%count:0;
 useEffect(()=>{
  const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduce=()=>setPaused(preference.matches);
  const visibility=()=>setHidden(document.hidden);
  reduce();visibility();preference.addEventListener('change',reduce);document.addEventListener('visibilitychange',visibility);
  return()=>{preference.removeEventListener('change',reduce);document.removeEventListener('visibilitychange',visibility)};
 },[]);
 const stopped=paused||hover||focused||hidden;
 useEffect(()=>{
  if(stopped||count<2)return;
  const timer=setTimeout(()=>setIndex(i=>(i+1)%count),5000);
  return()=>clearTimeout(timer);
 },[index,count,stopped]);
 const move=(direction:number)=>setIndex(i=>(i+direction+count)%count);
 if(!count)return null;
 const slide=slides[current];
 const picture=<picture><source media="(max-width:560px)" srcSet={slide.mobile}/><img src={slide.desktop} width="1600" height="640" alt={slide.alt} fetchPriority={current===0?"high":"auto"} draggable={false}/></picture>;
 return <section className={'home-carousel '+(slide.title?'home-carousel-photo':'')+(slide.artwork?' home-carousel-artwork':'')+(slide.mobileCopy?' home-carousel-mobile-copy':'')} aria-label={t('MaXiFlora: информация и возможности','MaXiFlora: ақпарат пен мүмкіндіктер')} aria-roledescription={t('Карусель','Карусель')}
  onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
  onFocus={()=>setFocused(true)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setFocused(false)}}
  onKeyDown={e=>{if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return;if(e.key==='ArrowRight'){e.preventDefault();move(1)}if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}}}
  onClickCapture={e=>{if(swiped.current){e.preventDefault();e.stopPropagation();swiped.current=false}}}
  onTouchStart={e=>{swiped.current=false;touch.current=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null}}
  onTouchEnd={e=>{if(touch.current!==null){const distance=touch.current.x-e.changedTouches[0].clientX,vertical=touch.current.y-e.changedTouches[0].clientY;if(Math.abs(distance)>45&&Math.abs(distance)>Math.abs(vertical)*1.2){swiped.current=true;move(distance>0?1:-1)}}touch.current=null}}
  onTouchCancel={()=>{touch.current=null}}>
  <div className="home-carousel-slide" role="group" aria-roledescription={t('Слайд','Слайд')} aria-label={`${current+1} / ${count}`}>
   {slide.onOpen?<button className="home-banner-link" onClick={slide.onOpen} title={slide.actionLabel}>{picture}{slide.mobileCopy&&<span className="home-mobile-promo-copy"><span>{slide.mobileCopy.eyebrow}</span><strong>{slide.mobileCopy.title.split('\n').map((line,i)=><span key={i}>{line}</span>)}</strong><small>{slide.mobileCopy.description}</small></span>}{slide.title?<span className="home-slide-copy">{slide.eyebrow&&<span className="home-slide-eyebrow">{slide.eyebrow}</span>}<span className="home-slide-title">{slide.title}</span>{slide.description&&<span className="home-slide-description">{slide.description}</span>}</span>:<span className="sr-only">{slide.actionLabel}</span>}</button>:picture}
  </div>
  {(count>1||slide.onOpen&&slide.cta)&&<div className="home-carousel-bar">
   {slide.onOpen&&slide.cta?<button className="home-carousel-action" onClick={slide.onOpen} title={slide.actionLabel}>{slide.cta}<ChevronRight size={17}/></button>:<span/>}
   {count>1?<div className="home-carousel-dots">{slides.map((item,i)=><button key={item.id} className={i===current?'active':''} onClick={()=>{setIndex(i);setPaused(true)}} aria-label={t('Показать слайд ','Слайдты көрсету: ')+(i+1)} aria-current={i===current?'true':undefined}/>)}</div>:<span/>}

  </div>}
 </section>;
}
