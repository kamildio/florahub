import {catalogGroups} from './catalog.mjs';
import {DomainError} from './engine.mjs';
// Only pass the public projection from snapshot() here, never raw inventory rows.
export function searchCatalog(products,params){
 const get=(key,fallback='')=>params.get(key)??fallback;
 const query=get('q').trim().toLocaleLowerCase('ru-RU'),city=get('city'),category=get('category','all'),height=get('height','all'),sort=get('sort','name'),transit=get('transit','false');
 const pageText=get('page','1'),limitText=get('limit','24');
 if(query.length>160||city.length>80||category.length>80||!['name','price','priceDesc'].includes(sort)||!['true','false'].includes(transit)||!/^[1-9]\d{0,5}$/.test(pageText)||!['24','48','96'].includes(limitText)||height!=='all'&&!/^\d{1,3}$/.test(height))throw new DomainError('Некорректные параметры каталога.',400);
 const eligible=products.filter(p=>p.city===city&&!!p.transit===(transit==='true'));
 const matched=eligible.filter(p=>(category==='all'||p.category===category)&&(height==='all'||p.height===Number(height))&&(p.name+' '+p.supplier).toLocaleLowerCase('ru-RU').includes(query));
 const rows=catalogGroups(matched,eligible);
 rows.sort((a,b)=>{
  if(sort!=='name'){const av=a.minPrice,bv=b.minPrice;if(av===null&&bv!==null)return 1;if(bv===null&&av!==null)return -1;if(av!==bv)return sort==='price'?av-bv:bv-av;}
  return a.product.name.localeCompare(b.product.name,'ru')||String(a.id).localeCompare(String(b.id),'ru',{numeric:true});
 });
 const limit=Number(limitText),pages=Math.max(1,Math.ceil(rows.length/limit)),page=Math.min(Number(pageText),pages);
 return {rows:rows.slice((page-1)*limit,page*limit),total:rows.length,page,pages,limit};
}
