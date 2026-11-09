import {homeAssets} from '../../lib/maxiflora/home-assets.mjs';
import type {BannerSlide} from './BannerCarousel';
type Row=Record<string,any>;
export function homeSlides(items:Row[],lang:string,onDestination:(id:string)=>void,onNews:(item:Row)=>void):BannerSlide[]{
 return items.filter(x=>x.languages==='both'||x.languages===lang).flatMap(item=>{
  const asset=homeAssets.find(x=>x.id===item.asset),copy=item[lang];if(!asset||!copy)return [];
  return [{id:item.id,desktop:asset.desktop,mobile:asset.mobile,alt:asset.artwork?copy.title:'',artwork:item.sponsorId?false:asset.artwork,...(!asset.artwork||item.sponsorId?{title:copy.title,description:copy.description}:{}),cta:copy.cta,onOpen:()=>item.destination==='news'?onNews(item):onDestination(item.sponsorId?'supplier:'+item.sponsorId:item.destination),actionLabel:copy.cta}];
 });
}
