import {readWorkbookRows,makeWorkbook} from './workbook.mjs';
// This browser-only adapter shares the same bounded ZIP/XML reader as receipts.
export const headers=['ID предложения','ID товара','Товар','Штук в упаковке','Цена упаковки, ₸','Всего, шт.','В пути','Дата поступления','Опубликовать','Версия данных','Номер операции','Кабинет','Срок публикации, дней','Минимальный заказ, шт.'];
export function offersWorkbook(t){return makeWorkbook('Предложения',headers,t.rows.map(r=>[r.id??'',r.baseId,r.name,r.pack,r.price,r.total,r.transit?'Да':'Нет',r.arrival||'',r.published?'Да':'Нет',r.version||'',t.operationNo,t.author,r.publicationDays??7,r.minOrderQty??r.pack]));}
export function directoryWorkbook(rows){return makeWorkbook('Справочник',['ID товара','Название','Категория','Страна','Длина, см'],rows.map(r=>[r.id,r.name,r.category,r.origin,r.height]));}
export function parseOfferRecords(records,hash){
 const rows=records.map(r=>({...r})),head=rows.shift(),letters='ABCDEFGHIJKLMN';if(!head||headers.slice(0,12).some((h,i)=>head[letters[i]]!==h)||(head.M&&head.M!==headers[12])||(head.N&&head.N!==headers[13])||Object.keys(head).some(k=>k!=='_row'&&!letters.split('').includes(k)&&head[k]))throw Error('Неверные заголовки. Скачайте шаблон предложений.');
 const filled=rows.filter(r=>Object.entries(r).some(([k,v])=>k!=='_row'&&v));if(!filled.length||filled.length>200)throw Error('В файле должно быть от 1 до 200 строк.');
 const operations=new Set(filled.map(r=>r.K).filter(Boolean)),authors=new Set(filled.map(r=>r.L).filter(Boolean));if(operations.size>1||authors.size>1)throw Error('Смешаны разные операции или кабинеты.');
 const integer=v=>/^\d+$/.test(String(v).trim())?Number(v):null,boolean=v=>v==='Да'?true:v==='Нет'?false:null;
 return {fileHash:hash,operationNo:[...operations][0]||'file-'+hash.slice(0,50),fileAuthor:[...authors][0]||'',rows:filled.map(r=>({row:r._row,id:r.A?integer(r.A):null,baseId:r.B||'',pack:integer(r.D),price:integer(r.E),total:integer(r.F),transit:boolean(r.G),arrival:r.H||'',published:boolean(r.I),publicationDays:r.M?integer(r.M):undefined,minOrderQty:r.N?integer(r.N):undefined,version:r.J||''}))};
}

export async function parseOffers(bytes){const rows=readWorkbookRows(bytes),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');return parseOfferRecords(rows,hash);}
