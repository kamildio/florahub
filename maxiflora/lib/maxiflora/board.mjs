import {activeCities} from './cities.mjs';
import {DomainError} from './engine.mjs';
import {recordMessage} from './message-sequence.mjs';
import {adPhotos,detachPhoto} from './media.mjs';
import {boardReportReasons,ownBoardReports,createBoardReport} from './board-reports.mjs';
const fail=(text,status=422)=>{throw new DomainError(text,status)};
const DAY=86400000;
export const boardCategories=[
 {id:'packaging',ru:'Упаковка',kk:'Қаптама',units:['roll','sheet','box','pack','piece']},
 {id:'equipment',ru:'Оборудование',kk:'Жабдықтар',units:['piece','set','day','month']},
 {id:'decor',ru:'Декор и аксессуары',kk:'Декор мен керек-жарақ',units:['piece','set','pack','meter','box']},
 {id:'services',ru:'Услуги',kk:'Қызметтер',units:['service','hour','visit','order','day','month']},
 {id:'other',ru:'Аренда помещений',kk:'Үй-жайды жалға беру',units:['square-meter','month','day','piece','pack','box','set','roll','sheet','meter','cubic-meter','gram','kilogram','milliliter','liter','bag']}
];
export const boardUnits={piece:['шт.','дана'],pack:['упаковка','қаптама'],box:['коробка','қорап'],set:['комплект','жиынтық'],roll:['рулон','орам'],sheet:['лист','парақ'],meter:['метр','метр'],'square-meter':['м²','м²'],'cubic-meter':['м³','м³'],gram:['грамм','грамм'],kilogram:['кг','кг'],milliliter:['мл','мл'],liter:['литр','литр'],bag:['мешок','қап'],service:['услуга','қызмет'],hour:['час','сағат'],visit:['выезд','бару'],order:['заказ','тапсырыс'],day:['сутки','тәулік'],month:['месяц','ай']};
const active=(ad,now)=>ad.status==='published'&&ad.expires>now;
export function ensureBoard(s,now=Date.now(),demo=false){
 if(!s.boardAds){
  s.boardAds=[];
  if(demo&&s.profiles['demo-supplier']&&s.profiles['demo-buyer'])s.boardAds=[
   {id:'demo-ad-packaging',ownerId:'demo-supplier',title:'Упаковка для букетов',description:'Тестовое объявление. Матовая плёнка для цветочных студий. Цвета и получение согласуйте с автором в чате.',city:'Шымкент',category:'packaging',price:6500,pricing:'fixed',unit:'roll',composition:'50 метров в рулоне',image:'/images/florist-crates-v2.webp',demo:true,status:'published',version:1,created:now,publishedAt:now,expires:now+30*DAY,history:[]},
   {id:'demo-ad-decoration',ownerId:'demo-buyer',title:'Оформление витрин цветами',description:'Тестовое объявление. Сезонное оформление витрин и цветочных уголков. Объём, материалы и стоимость обсуждаются с автором.',city:'Шымкент',category:'services',price:0,pricing:'negotiable',unit:'service',composition:'',image:'/images/florist-roses-v2.webp',demo:true,status:'published',version:1,created:now,publishedAt:now,expires:now+30*DAY,history:[]}
  ];
 }
 s.boardThreads??=[];
 for(const ad of s.boardAds)if(ad.status==='published'&&ad.expires<=now){ad.status='expired';ad.version++;ad.history.push({time:now,event:'expired'});}
}
const publicAd=(s,ad)=>({id:ad.id,version:ad.version,title:ad.title,description:ad.description,city:ad.city,category:ad.category,price:ad.price,pricing:ad.pricing,unit:ad.unit,composition:ad.composition,image:ad.image||null,demo:!!ad.demo,author:s.profiles[ad.ownerId]?.name||'Пользователь',publishedAt:ad.publishedAt,expires:ad.expires});
export function boardView(s,u,now=Date.now()){
 return {board:{categories:boardCategories,units:boardUnits,reportReasons:boardReportReasons,reports:ownBoardReports(s,u),ads:(s.boardAds||[]).filter(ad=>active(ad,now)).map(ad=>publicAd(s,ad)),ownAds:u?(s.boardAds||[]).filter(ad=>ad.ownerId===u.id).map(ad=>({...ad,photos:adPhotos(s,ad)})):[],threads:u?(s.boardThreads||[]).filter(thread=>thread.participants.includes(u.id)).map(thread=>({...thread,peer:s.profiles[thread.participants.find(id=>id!==u.id)]?.name||'Пользователь'})):[]}};
}
const own=(s,u,b)=>{const ad=s.boardAds.find(ad=>ad.id===b.id&&ad.ownerId===u.id);if(!ad)fail('Объявление недоступно.',403);if(!Number.isInteger(b.version)||ad.version!==b.version)fail('Объявление изменилось. Откройте актуальную версию.',409);return ad};
export function validateBoardAd(b,s){
 const category=boardCategories.find(x=>x.id===b.category);
 if(!category||!category.units.includes(b.unit))fail('Выберите категорию и подходящую единицу цены.');
 if(typeof b.title!=='string'||b.title.trim().length<5||b.title.length>100||typeof b.description!=='string'||b.description.trim().length<10||b.description.length>2000)fail('Название — от 5 до 100 символов, описание — от 10 до 2000.');
 if(!activeCities(s).includes(b.city))fail('Выберите город из списка.');
 if(!['fixed','from','negotiable'].includes(b.pricing)||b.category!=='services'&&b.pricing!=='fixed')fail('Цена «от» и «договорная» доступны для услуг.');
 if(b.pricing!=='negotiable'&&(!Number.isSafeInteger(b.price)||b.price<1||b.price>1000000000))fail('Укажите целую цену от 1 до 1 000 000 000 тенге.');
 if(typeof b.composition!=='string'||b.composition.length>180)fail('Состав упаковки — до 180 символов.');
 return {title:b.title.trim(),description:b.description.trim(),city:b.city,category:b.category,price:b.pricing==='negotiable'?0:b.price,pricing:b.pricing,unit:b.unit,composition:b.composition.trim()};
}
export function boardAction(s,u,b,now=Date.now()){
 if(!u)fail('Войдите для размещения и переписки.',401);
 s.boardAds??=[];s.boardThreads??=[];
 if(b.action==='board-report')return createBoardReport(s,u,b,now);
 if(b.action==='board-photo-detach')return detachPhoto(s,u,b,now);
 if(b.action==='board-save'){
  const input=validateBoardAd(b,s);let ad=b.id?own(s,u,b):null;
  if(ad){ad.history.push({time:now,event:'edited',previous:{...ad,history:undefined}});Object.assign(ad,input,{status:'draft',version:ad.version+1,updated:now,moderationDecision:null});}
  else{ad={...input,id:crypto.randomUUID(),ownerId:u.id,image:null,status:'draft',version:1,created:now,history:[{time:now,event:'created'}]};s.boardAds.unshift(ad);}
  return {id:ad.id,version:ad.version,status:ad.status};
 }
 if(b.action==='board-submit'||b.action==='board-withdraw'){
  const ad=own(s,u,b);
  if(b.action==='board-submit'){
   if(ad.status==='pending')fail('Объявление уже ожидает модерации.',409);
   if(ad.status==='published')fail('Объявление уже опубликовано.',409);
   validateBoardAd(ad);ad.status='pending';ad.submitted=now;
  }else ad.status='withdrawn';
  ad.version++;ad.history.push({time:now,event:ad.status});return {id:ad.id,version:ad.version,status:ad.status};
 }
 if(b.action==='board-open-chat'){
  const ad=s.boardAds.find(a=>a.id===b.adId&&active(a,now));if(!ad)fail('Объявление больше не опубликовано.',409);
  if(ad.ownerId===u.id)fail('Это ваше объявление. Переписка с собой недоступна.');
  if(ad.version!==b.version)fail('Объявление изменилось. Обновите доску.',409);
  let thread=s.boardThreads.find(t=>t.adId===ad.id&&t.participants.includes(u.id)&&t.participants.includes(ad.ownerId));
  if(!thread){thread={id:crypto.randomUUID(),adId:ad.id,adTitle:ad.title,participants:[u.id,ad.ownerId],created:now,messages:[]};s.boardThreads.unshift(thread);}
  return {peerId:ad.ownerId,contextKey:'board:'+thread.id};
 }
 if(b.action==='board-message'){
  if(typeof b.text!=='string'||!b.text.trim()||b.text.length>2000)fail('Введите сообщение до 2000 символов.');
  let thread;
  if(b.threadId){thread=s.boardThreads.find(x=>x.id===b.threadId&&x.participants.includes(u.id));if(!thread)fail('Переписка недоступна.',403);}
  else{
   const ad=s.boardAds.find(x=>x.id===b.adId&&active(x,now));if(!ad)fail('Объявление больше не опубликовано.',409);
   if(ad.ownerId===u.id)fail('Это ваше объявление. Переписка с собой недоступна.');
   thread=s.boardThreads.find(x=>x.adId===ad.id&&x.participants.includes(u.id)&&x.participants.includes(ad.ownerId));
   if(!thread){thread={id:crypto.randomUUID(),adId:ad.id,adTitle:ad.title,participants:[u.id,ad.ownerId],created:now,messages:[]};s.boardThreads.unshift(thread);}
  }
  const message={id:crypto.randomUUID(),from:u.id,text:b.text.trim(),time:now};recordMessage(s,message,thread.participants.find(id=>id!==u.id),'board:'+thread.id);thread.messages.push(message);thread.updated=now;
  return {id:thread.id};
 }
 fail('Действие доски недоступно.',403);
}
