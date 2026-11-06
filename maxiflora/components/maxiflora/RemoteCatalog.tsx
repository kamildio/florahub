'use client';
import {useEffect,useState} from 'react';
import CatalogGroups from './CatalogGroups';
type Row=Record<string,any>;
export default function RemoteCatalog({filters,revision,renderOffer,lang}:{filters:Record<string,string>;revision?:number;renderOffer:(p:Row)=>React.ReactNode;lang:string}){
 const [page,setPage]=useState(1),[limit,setLimit]=useState(24),[result,setResult]=useState<Row|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const filterKey=JSON.stringify(filters),key=filterKey+'|'+page+'|'+limit,t=(r:string,k:string)=>lang==='ru'?r:k;
 useEffect(()=>{setPage(1);setError('')},[filterKey]);
 useEffect(()=>{const controller=new AbortController();let active=true;
  const timer=setTimeout(async()=>{try{
   const params=new URLSearchParams({...JSON.parse(filterKey),page:String(page),limit:String(limit)});
   const response=await fetch('/api/platform/catalog?'+params,{credentials:'same-origin',cache:'no-store',signal:controller.signal});
   const data=await response.json() as Row;if(!response.ok)throw new Error(data.error||t('Каталог недоступен.','Каталог қолжетімсіз.'));
   if(active){setResult({...data,key});setError('')}
  }catch(e){if(active&&!controller.signal.aborted)setError((e as Error).message)}},200);
  return()=>{active=false;clearTimeout(timer);controller.abort()};
 },[filterKey,page,limit,revision,retry]);
 if(error)return <div role="alert"><p>{error}</p><button className="btn secondary" onClick={()=>{setError('');setRetry(n=>n+1)}}>{t('Повторить','Қайталау')}</button></div>;
 if(!result||result.key!==key)return <p role="status">{t('Загружаем предложения…','Ұсыныстар жүктелуде…')}</p>;
 if(!result.total)return <div className="empty"><h2>{t('Здесь пока нет предложений','Әзірге ұсыныстар жоқ')}</h2><p>{t('Измените фильтры или выберите другой город.','Сүзгілерді өзгертіңіз немесе басқа қала таңдаңыз.')}</p></div>;
 return <CatalogGroups key={key} products={[]} remote={result} onPage={setPage} onLimit={n=>{setLimit(n);setPage(1)}} renderOffer={renderOffer} lang={lang}/>;
}
