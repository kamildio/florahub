'use client';
import {useEffect,useState} from 'react';
import {ImagePlus,FileImage,Shield,X,RefreshCw,Upload} from 'lucide-react';
import {inspectPhoto,MAX_PHOTO_BYTES,MAX_AD_PHOTOS} from '../../lib/maxiflora/media.mjs';
type Row=Record<string,any>;
type Pending={file:File;url:string;operationId:string;version:number};
export default function BoardPhotos({ad,lang,onRefresh,onAction}:{ad:Row;lang:string;onRefresh:()=>Promise<any>;onAction:(b:Row)=>Promise<Row>}){
 const t=(r:string,k:string)=>lang==='ru'?r:k;
 const [pending,setPending]=useState<Pending|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const photos:Row[]=ad.photos||[],editable=ad.status==='draft',full=photos.length>=MAX_AD_PHOTOS;
 useEffect(()=>()=>{if(pending?.url)URL.revokeObjectURL(pending.url)},[pending?.url]);
 async function choose(file?:File){
  setError('');setNotice('');setPending(null);if(!file)return;
  if(file.size>MAX_PHOTO_BYTES){setError(t('Фото — до 2 МБ.','Фото — 2 МБ-қа дейін.'));return}
  setBusy(true);try{inspectPhoto(new Uint8Array(await file.arrayBuffer()),file.type,file.name);setPending({file,url:URL.createObjectURL(file),operationId:crypto.randomUUID(),version:ad.version})}catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 async function upload(){
  if(!pending||busy)return;setBusy(true);setError('');setNotice('');
  try{
   const response=await fetch('/api/platform/media-upload',{method:'POST',credentials:'same-origin',headers:{'Content-Type':pending.file.type,'x-maxiflora-ad':ad.id,'x-maxiflora-version':String(pending.version),'x-maxiflora-upload-id':pending.operationId,'x-maxiflora-filename':encodeURIComponent(pending.file.name)},body:pending.file});
   const result=await response.json() as Row;if(!response.ok)throw new Error(result.error||t('Загрузка не завершена. Повторите попытку.','Жүктеу аяқталмады. Қайталап көріңіз.'));
   await onRefresh();setPending(null);setNotice(t('Фото сохранено в закрытом хранилище и ожидает проверки.','Фото жабық қоймаға сақталды, тексеруді күтуде.'));
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 async function remove(fileId:string){if(busy)return;setBusy(true);setError('');setNotice('');try{await onAction({action:'board-photo-detach',id:ad.id,version:ad.version,fileId});setNotice(t('Фотография убрана из черновика.','Фото жобадан алынды.'))}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <section className="board-photos" aria-labelledby="board-photos-title"><div className="board-photos-heading"><h3 id="board-photos-title"><ImagePlus size={20}/>{t('Фотографии объявления','Хабарландыру фотосуреттері')}</h3><span>{photos.length} / {MAX_AD_PHOTOS}</span></div>
  <p className="board-photo-limits">{t('JPG, PNG или WebP · до 2 МБ каждое · до 6 фото · до 16 Мп.','JPG, PNG немесе WebP · әрқайсысы 2 МБ-қа дейін · 6 фотоға дейін · 16 Мп-қа дейін.')}</p>
  <div className="note board-photo-security"><Shield size={18}/><p>{t('Тестовая загрузка: используйте тестовые изображения. До проверки безопасности файлы закрыты. Антивирус и обработка фотографий ещё не подключены — изображения ожидают проверки, не публикуются и не скачиваются.','Сынақ жүктеу: сынақ суреттерін пайдаланыңыз. Қауіпсіздік тексеруіне дейін файлдар жабық. Антивирус пен фото өңдеу әлі қосылмаған — суреттер тексеруді күтеді, жарияланбайды және жүктеп алынбайды.')}</p></div>
  {error&&<div className="note error" role="alert">{error}</div>}{notice&&<p className="board-photo-notice" role="status">{notice}</p>}
  {photos.length>0&&<ul className="board-photo-list">{photos.map(photo=><li key={photo.id}><FileImage size={23}/><div><b>{photo.name}</b><small>{Math.ceil(photo.bytes/1024)} {t('КБ','КБ')} · {photo.width} × {photo.height}</small><span>{t('Ожидает проверки безопасности','Қауіпсіздік тексеруін күтуде')}</span></div>{editable&&<button disabled={busy} className="iconbtn" onClick={()=>remove(photo.id)} aria-label={t('Убрать фото из черновика: ','Фотосын жобадан алу: ')+photo.name} title={t('Убрать привязку к черновику. История загрузки сохранится.','Жобадан ажырату. Жүктеу тарихы сақталады.')}><X size={17}/></button>}</li>)}</ul>}
  {editable?<><div className="board-photo-upload"><label htmlFor="board-photo-file">{full?t('Добавлено максимальное количество фото','Ең көп фото саны қосылды'):t('Выберите фотографию','Фотосуретті таңдаңыз')}</label><input id="board-photo-file" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||full} onChange={e=>{choose(e.target.files?.[0]);e.currentTarget.value=''}}/><small>{t('Лимит загрузки аккаунта — 24 МБ за сутки.','Аккаунттың жүктеу шегі — тәулігіне 24 МБ.')}</small></div>{pending&&<div className="board-photo-preview"><img src={pending.url} alt={t('Предпросмотр выбранного фото на вашем устройстве','Құрылғыңызда таңдалған фотоны алдын ала қарау')}/><div><b>{pending.file.name}</b><p>{t('Это локальный предпросмотр. Файл будет отправлен после нажатия кнопки.','Бұл жергілікті алдын ала қарау. Файл түймені басқаннан кейін жіберіледі.')}</p><button className="btn" disabled={busy} onClick={upload}><Upload size={16}/>{busy?t('Загружаем…','Жүктелуде…'):t('Загрузить в черновик','Жобаға жүктеу')}</button></div></div>}</>:<p className="board-photo-limits">{t('Чтобы изменить фотографии, откройте редактор и сохраните черновик.','Фотоларды өзгерту үшін редакторды ашып, жобаны сақтаңыз.')}</p>}
  <button className="backlink board-photo-refresh" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await onRefresh();setPending(null)}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}><RefreshCw size={14}/>{t('Обновить данные фотографий','Фото деректерін жаңарту')}</button>
 </section>;
}
