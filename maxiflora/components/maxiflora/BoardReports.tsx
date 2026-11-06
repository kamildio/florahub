'use client';
import {useEffect,useRef,useState} from 'react';
import {Flag,ArrowLeft,FileText} from 'lucide-react';
type Row=Record<string,any>;
type Props={lang:string;reasons:Row[]};
const date=(time:number)=>new Intl.DateTimeFormat('ru-RU',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'Asia/Almaty'}).format(time);
export function BoardReportForm({ad,profile,reports,reasons,lang,onAction,onAuth,onReports}:{ad:Row;profile?:Row;reports:Row[];onAction:(body:Row)=>Promise<Row>;onAuth:()=>void;onReports:(saved?:boolean)=>void}&Props){
 const t=(ru:string,kk:string)=>lang==='ru'?ru:kk;
 const [opened,setOpened]=useState(false),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{if(opened)heading.current?.focus()},[opened]);
 const existing=reports.find(r=>r.adId===ad.id&&r.status==='open');
 return <section className="board-report-area" aria-label={t('Жалоба на объявление','Хабарландыруға шағым')}>
  {existing?<div className="note"><b>{t('Ваша жалоба зарегистрирована','Шағымыңыз тіркелді')}</b><p>{t('Она ожидает рассмотрения. Повторно отправлять её не нужно.','Ол қарауды күтуде. Қайта жіберудің қажеті жоқ.')}</p><button className="backlink" onClick={()=>onReports()}>{t('Открыть мои жалобы','Менің шағымдарымды ашу')}</button></div>:!opened?<button className="backlink" onClick={()=>profile?setOpened(true):onAuth()}><Flag size={15}/>{t('Пожаловаться на объявление','Хабарландыруға шағымдану')}</button>:<>
   <h3 tabIndex={-1} ref={heading}>{t('Жалоба на объявление','Хабарландыруға шағым')}</h3>
   <p className="board-report-help">{t('Выберите причину. Жалоба сохранит текущую версию объявления; до решения оно останется на доске.','Себебін таңдаңыз. Шағым хабарландырудың ағымдағы нұсқасын сақтайды; шешімге дейін ол тақтада қалады.')}</p>
   <div className="note warn">{t('Тестовый режим: жалоба сохранится в системе. Решение можно проверить в «Моих жалобах» и уведомлениях. Проверка доступна в тестовом кабинете модератора.','Сынақ режимі: шағым жүйеде сақталады. Шешімді «Менің шағымдарым» бөлімінде және хабарландыруларда тексеруге болады. Тексеру модератордың сынақ кабинетінде қолжетімді.')}</div>
   <form onSubmit={async e=>{e.preventDefault();if(busy)return;const comment=String(new FormData(e.currentTarget).get('comment')||'');setBusy(true);setError('');try{await onAction({action:'board-report',adId:ad.id,version:ad.version,reason,comment});onReports(true)}catch(e){setError((e as Error).message)}finally{setBusy(false)}}}>
    <fieldset disabled={busy}><legend>{t('Причина жалобы','Шағым себебі')}</legend><div className="board-report-reasons">{reasons.map(r=><label key={r.id}><input type="radio" name="reason" value={r.id} checked={reason===r.id} onChange={()=>setReason(r.id)} required/>{lang==='ru'?r.ru:r.kk}</label>)}</div></fieldset>
    <div className="field"><label htmlFor="board-report-comment">{t('Комментарий','Түсініктеме')} {reason==='other'?t('(обязательно)','(міндетті)'):t('(необязательно)','(міндетті емес)')}</label><textarea id="board-report-comment" name="comment" maxLength={2000} required={reason==='other'} disabled={busy} placeholder={t('Что стоит проверить? До 2000 символов. Не указывайте пароли и платёжные данные.','Нені тексеру керек? 2000 таңбаға дейін. Құпиясөздер мен төлем деректерін көрсетпеңіз.')}/></div>
    {error&&<div className="note error" role="alert">{error}</div>}
    <div className="btnrow"><button className="btn" disabled={busy||!reason}>{busy?t('Сохраняем…','Сақталуда…'):t('Зарегистрировать жалобу','Шағымды тіркеу')}</button><button type="button" className="btn secondary" disabled={busy} onClick={()=>{setOpened(false);setError('')}}>{t('Отмена','Бас тарту')}</button></div>
   </form>
  </>}
 </section>;
}
export function BoardReportsList({reports,reasons,units,lang}:{reports:Row[];units:Row}&Props){
 const t=(ru:string,kk:string)=>lang==='ru'?ru:kk;
 const [selected,setSelected]=useState('');const ref=useRef<HTMLElement>(null),chosen=reports.find(r=>r.id===selected);
 useEffect(()=>{ref.current?.focus()},[selected]);
 const result=(r:Row)=>r.status==='closed'?(r.decision?.outcome==='confirmed'?t('Подтверждена','Расталды'):t('Не подтверждена','Расталмады')):t('Ожидает рассмотрения','Қарауды күтуде');
 const reason=(id:string)=>{const r=reasons.find(r=>r.id===id);return r?(lang==='ru'?r.ru:r.kk):id};
 return <section className="board-reports" ref={ref} tabIndex={-1} aria-label={t('Мои жалобы','Менің шағымдарым')}>
  <div className="note">{t('Здесь видны только ваши жалобы. Они не меняют рейтинг автора и не снимают объявление автоматически. В тестовой версии решения доступны через профиль модератора.','Мұнда тек сіздің шағымдарыңыз көрінеді. Олар автордың рейтингіне әсер етпейді және хабарландыруды автоматты түрде алып тастамайды. Сынақ нұсқасында шешімдер модератор профилі арқылы қолжетімді.')}</div>
  {chosen?<article className="card board-report-detail"><button className="backlink" onClick={()=>setSelected('')}><ArrowLeft size={16}/>{t('Все мои жалобы','Менің барлық шағымдарым')}</button><span className="tag gray">{result(chosen)}</span><h2>{chosen.snapshot.title}</h2><p className="board-report-meta">{date(chosen.created)} · Asia/Almaty</p><h3>{t('Причина','Себебі')}</h3><p>{reason(chosen.reason)}</p>{chosen.comment&&<><h3>{t('Ваш комментарий','Сіздің түсініктемеңіз')}</h3><p className="board-description">{chosen.comment}</p></>}{chosen.decision&&<div className="note"><h3>{t('Решение модератора','Модератор шешімі')}</h3><p>{date(chosen.decision.time)} · Asia/Almaty</p><p className="board-description">{chosen.decision.reason}</p></div>}<details><summary>{t('Версия объявления при подаче жалобы','Шағым берілген кездегі хабарландыру нұсқасы')}</summary><dl><dt>{t('Версия','Нұсқа')}</dt><dd>{chosen.snapshot.version}</dd><dt>{t('Автор','Автор')}</dt><dd>{chosen.snapshot.author}</dd><dt>{t('Город','Қала')}</dt><dd>{chosen.snapshot.city}</dd><dt>{t('Цена','Бағасы')}</dt><dd>{chosen.snapshot.pricing==='negotiable'?t('Договорная','Келісімді'):(chosen.snapshot.pricing==='from'?t('от ','бастап '):'')+new Intl.NumberFormat('ru-RU').format(chosen.snapshot.price)+' ₸ / '+(units[chosen.snapshot.unit]?.[lang==='ru'?0:1]||chosen.snapshot.unit)}</dd></dl><p className="board-description">{chosen.snapshot.composition}</p><p className="board-description">{chosen.snapshot.description}</p></details><small className="board-report-id">{t('Номер жалобы: ','Шағым нөмірі: ')}{chosen.id}</small></article>:reports.length?<div className="board-report-list">{reports.map(r=><button className="card" key={r.id} onClick={()=>setSelected(r.id)}><span className="tag gray">{result(r)}</span><b>{r.snapshot.title}</b><span>{reason(r.reason)}</span><small>{date(r.created)} · Asia/Almaty</small><span className="board-card-open">{t('Открыть жалобу','Шағымды ашу')} →</span></button>)}</div>:<div className="empty"><FileText/><h2>{t('У вас пока нет жалоб','Сізде әзірге шағым жоқ')}</h2><p>{t('Если объявление нарушает правила, откройте его и нажмите «Пожаловаться на объявление».','Хабарландыру ережелерді бұзса, оны ашып, «Хабарландыруға шағымдану» түймесін басыңыз.')}</p></div>}
 </section>;
}
