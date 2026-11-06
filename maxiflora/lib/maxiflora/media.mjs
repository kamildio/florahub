import {DomainError} from './engine.mjs';
const fail=(message,status=422)=>{throw new DomainError(message,status)};
export const MAX_PHOTO_BYTES=2*1024*1024,MAX_AD_PHOTOS=6;
const text=(bytes,a,b)=>String.fromCharCode(...bytes.subarray(a,b));
const u16=(b,p)=>b[p]*256+b[p+1],u32=(b,p)=>new DataView(b.buffer,b.byteOffset,b.byteLength).getUint32(p),le32=(b,p)=>new DataView(b.buffer,b.byteOffset,b.byteLength).getUint32(p,true);
const dimensions=(width,height)=>{if(!width||!height||width>10000||height>10000||width*height>16000000)fail('Изображение должно быть не больше 16 мегапикселей и 10 000 пикселей по стороне.');return {width,height}};
const crc=(bytes)=>{let c=0xffffffff;for(const byte of bytes){c^=byte;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0};
// Container checks protect ingestion; they are deliberately NOT an antivirus/decoder verdict.
export function inspectPhoto(bytes,mime,name){
 if(!(bytes instanceof Uint8Array)||bytes.length<24||bytes.length>MAX_PHOTO_BYTES)fail('Фото — до 2 МБ.',413);
 const type=String(mime||'').split(';')[0].trim().toLowerCase();
 if(!['image/jpeg','image/png','image/webp'].includes(type))fail('Выберите JPG, PNG или WebP. SVG, GIF и видео не поддерживаются.',415);
 const filename=String(name||'').replace(/[\u0000-\u001f\u007f]/g,'').slice(0,150);
 const extension=filename.toLowerCase().split('.').at(-1);
 if(!({ 'image/jpeg':['jpg','jpeg'],'image/png':['png'],'image/webp':['webp']}[type].includes(extension)))fail('Расширение файла не соответствует формату фотографии.',415);
 let shape;
 if(type==='image/png'){
  if(![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))fail('Файл не является PNG.',415);
  let pos=8,seenHeader=false,seenData=false,ended=false;
  while(pos+12<=bytes.length){const length=u32(bytes,pos);if(length>MAX_PHOTO_BYTES||pos+12+length>bytes.length)fail('Повреждённая структура PNG.');const kind=text(bytes,pos+4,pos+8);if(crc(bytes.subarray(pos+4,pos+8+length))!==u32(bytes,pos+8+length))fail('Повреждённая контрольная сумма PNG.');
   if(!seenHeader){if(kind!=='IHDR'||length!==13)fail('Нет заголовка PNG.');shape=dimensions(u32(bytes,pos+8),u32(bytes,pos+12));seenHeader=true;}
   else if(kind==='IHDR')fail('Повторный заголовок PNG.');
   if(['acTL','fcTL','fdAT'].includes(kind))fail('Анимированные изображения не поддерживаются.');
   if(kind==='IDAT')seenData=true;
   pos+=length+12;if(kind==='IEND'){if(length||!seenData||pos!==bytes.length)fail('Повреждённое окончание PNG.');ended=true;break;}
  }
  if(!ended)fail('PNG загружен не полностью.');
 }else if(type==='image/jpeg'){
  if(bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)fail('Файл не является полным JPEG.',415);
  let pos=2,sawScan=false;
  while(pos<bytes.length-2){if(bytes[pos++]!==255)fail('Повреждённая структура JPEG.');while(bytes[pos]===255)pos++;const marker=bytes[pos++];if(pos+2>bytes.length)fail('Повреждённый сегмент JPEG.');const size=u16(bytes,pos);if(size<2||pos+size>bytes.length-2)fail('Повреждённая длина JPEG.');
   if([192,193,194].includes(marker)){if(size<8)fail('Повреждённый размер JPEG.');shape=dimensions(u16(bytes,pos+5),u16(bytes,pos+3));}
   if(marker===218){sawScan=true;break;}pos+=size;
  }
  if(!shape||!sawScan)fail('В JPEG нет изображения.');
 }else{
  if(text(bytes,0,4)!=='RIFF'||text(bytes,8,12)!=='WEBP'||le32(bytes,4)+8!==bytes.length)fail('Файл не является полным WebP.',415);
  let pos=12,found=false;
  while(pos+8<=bytes.length){const kind=text(bytes,pos,pos+4),size=le32(bytes,pos+4),start=pos+8;if(start+size>bytes.length)fail('Повреждённая структура WebP.');
   if(['ANIM','ANMF'].includes(kind)||kind==='VP8X'&&size>=1&&(bytes[start]&2))fail('Анимированные изображения не поддерживаются.');
   if(kind==='VP8 '&&size>=10){if(bytes[start+3]!==157||bytes[start+4]!==1||bytes[start+5]!==42)fail('Повреждённый кадр WebP.');shape=dimensions((bytes[start+6]+bytes[start+7]*256)&16383,(bytes[start+8]+bytes[start+9]*256)&16383);found=true;}
   if(kind==='VP8L'&&size>=5){if(bytes[start]!==47)fail('Повреждённый кадр WebP.');const bits=le32(bytes,start+1);shape=dimensions((bits&16383)+1,((bits>>>14)&16383)+1);found=true;}
   pos=start+size+(size&1);
  }
  if(!found||pos!==bytes.length)fail('В WebP нет полного изображения.');
 }
 return {name:filename,mime:type,bytes:bytes.length,...shape};
}
export function ownedAd(s,u,id){if(!u)fail('Войдите в аккаунт.',401);const ad=(s.boardAds||[]).find(a=>a.id===id&&a.ownerId===u.id);if(!ad)fail('Объявление недоступно.',404);return ad;}
export const photoInfo=f=>({id:f.id,name:f.name,mime:f.mime,bytes:f.bytes,width:f.width,height:f.height,status:f.status,created:f.created});
export function adPhotos(s,ad){return (ad.photoIds||[]).map(id=>(s.boardFiles||[]).find(f=>f.id===id&&f.ownerId===ad.ownerId&&f.adId===ad.id&&f.status!=='detached')).filter(Boolean).map(photoInfo)}
export function attachPhoto(s,u,{adId,version,photo},now=Date.now()){
 const ad=ownedAd(s,u,adId);if(ad.version!==version)fail('Объявление изменилось. Обновите предпросмотр и повторите загрузку.',409);
 if(ad.status!=='draft')fail('Сначала сохраните объявление как черновик. Публикация и очередь не изменяются загрузкой.',409);
 s.boardFiles??=[];ad.photoIds??=[];
 if(ad.photoIds.length>=MAX_AD_PHOTOS)fail('В одном объявлении — до 6 фотографий.');
 if(s.boardFiles.filter(f=>f.ownerId===u.id&&f.created>now-86400000).reduce((n,f)=>n+f.bytes,0)+photo.bytes>24*1024*1024)fail('Лимит загрузки — 24 МБ за сутки. Повторите позже.',429);
 const file={...photo,ownerId:u.id,adId:ad.id,status:'quarantined',created:now};s.boardFiles.push(file);ad.photoIds.push(file.id);ad.version++;ad.history.push({event:'photo-uploaded',fileId:file.id,time:now});return {photo:photoInfo(file),id:ad.id,version:ad.version};
}
export function detachPhoto(s,u,b,now=Date.now()){
 const ad=ownedAd(s,u,b.id);if(ad.version!==b.version)fail('Объявление изменилось. Обновите предпросмотр.',409);if(ad.status!=='draft')fail('Изменять фотографии можно в черновике.',409);
 const file=(s.boardFiles||[]).find(f=>f.id===b.fileId&&f.ownerId===u.id&&f.adId===ad.id&&ad.photoIds?.includes(f.id));if(!file)fail('Фотография недоступна.',404);
 ad.photoIds=ad.photoIds.filter(id=>id!==file.id);file.status='detached';file.detachedAt=now;ad.version++;ad.history.push({event:'photo-detached',fileId:file.id,time:now});return {id:ad.id,version:ad.version};
}
export async function boundedPhotoBody(request){
 const declared=Number(request.headers.get('content-length'));if(Number.isFinite(declared)&&declared>MAX_PHOTO_BYTES)fail('Фото — до 2 МБ.',413);
 const reader=request.body?.getReader();if(!reader)fail('Выберите фотографию.');const chunks=[];let length=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>MAX_PHOTO_BYTES){await reader.cancel();fail('Фото — до 2 МБ.',413)}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}return bytes;
}
