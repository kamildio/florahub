import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';
const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s};
export function makeWorkbook(name,headers,rows){
 const table=[headers,...rows].map((row,i)=>`<row r="${i+1}">${row.map((v,j)=>typeof v==='number'&&Number.isFinite(v)?`<c r="${col(j)}${i+1}"><v>${v}</v></c>`:`<c r="${col(j)}${i+1}" t="inlineStr"><is><t xml:space="preserve">${escape(v)}</t></is></c>`).join('')}</row>`).join('');
 const files={
  '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
  '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  'xl/workbook.xml':`<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escape(name)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
  'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
  'xl/worksheets/sheet1.xml':`<worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="15" customWidth="1"/><col min="2" max="2" width="35" customWidth="1"/><col min="3" max="30" width="22" customWidth="1"/></cols><sheetData>${table}</sheetData><autoFilter ref="A1:${col(headers.length-1)}${rows.length+1}"/></worksheet>`
 };
 return zipSync(Object.fromEntries(Object.entries(files).map(([name,xml])=>[name,strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+xml)])));
}
export const receiptHeaders=['ID предложения','Товар','Поступило, шт.','Версия данных','Номер операции','Кабинет'];
export function templateWorkbook(template){return makeWorkbook('Поступления',receiptHeaders,template.rows.map(x=>[x.id,x.name,0,x.version,template.operationNo,template.author]));}
export function downloadWorkbook(bytes,name){const blob=new Blob([new Uint8Array(bytes)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
export function boundedUnzip(bytes){
 if(bytes.length>1048576)throw Error('Размер XLSX — не более 1 МБ.');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break;}
 if(end<0)throw Error('Не удалось прочитать XLSX. Используйте файл из шаблона.');
 const count=view.getUint16(end+10,true),offset=view.getUint32(end+16,true);let pos=offset,total=0;
 if(count>100||!count)throw Error('Слишком много внутренних файлов XLSX.');
 for(let i=0;i<count;i++){
  if(pos+46>bytes.length||view.getUint32(pos,true)!==0x02014b50)throw Error('Повреждённый XLSX.');
  total+=view.getUint32(pos+24,true);if(total>2097152)throw Error('Распакованный XLSX превышает 2 МБ. Разделите файл.');
  pos+=46+view.getUint16(pos+28,true)+view.getUint16(pos+30,true)+view.getUint16(pos+32,true);
 }
 return unzipSync(bytes,{filter:f=>f.originalSize<=2097152&&['xl/sharedStrings.xml','xl/worksheets/sheet1.xml'].includes(f.name)});
}
export function readWorkbookRows(bytes){
 const files=boundedUnzip(bytes);
 function xml(name){if(!files[name])return null;const text=strFromU8(files[name]);if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('XML с внешними объявлениями не поддерживается.');const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw Error('Повреждены данные XLSX.');return doc;}
 const strings=Array.from(xml('xl/sharedStrings.xml')?.getElementsByTagName('si')||[]).map(x=>Array.from(x.getElementsByTagName('t')).map(t=>t.textContent||'').join(''));
 const sheet=xml('xl/worksheets/sheet1.xml');if(!sheet)throw Error('Не найден первый лист XLSX.');
 if(sheet.getElementsByTagName('f').length)throw Error('Формулы не поддерживаются. Вставьте значения и загрузите файл заново.');
 const records=Array.from(sheet.getElementsByTagName('row')).map(row=>{
  const cells={};for(const c of Array.from(row.getElementsByTagName('c'))){const key=(c.getAttribute('r')||'').replace(/\d/g,''),type=c.getAttribute('t');const value=c.getElementsByTagName('v')[0]?.textContent||'';cells[key]=type==='s'?strings[Number(value)]||'':type==='inlineStr'?Array.from(c.getElementsByTagName('t')).map(t=>t.textContent||'').join(''):value;}return {...cells,_row:Number(row.getAttribute('r'))};
 });
 return records;
}
export async function parseReceipt(bytes){
 const records=readWorkbookRows(bytes);
 const head=records.shift();if(!head||head.A!==receiptHeaders[0]||head.B!==receiptHeaders[1]||head.C!==receiptHeaders[2])throw Error('Заголовки должны быть: ID предложения / Товар / Поступило, шт. Скачайте шаблон.');
 if(Object.keys(head).some(k=>!['A','B','C','D','E','F','_row'].includes(k)&&head[k]))throw Error('Неизвестные колонки. Используйте шаблон поступления.');
 for(const [key,index] of [['D',3],['E',4],['F',5]])if(head[key]&&head[key]!==receiptHeaders[index])throw Error('Неизвестный служебный заголовок. Используйте исходный шаблон.');
 const filled=records.filter(r=>Object.entries(r).some(([k,v])=>k!=='_row'&&v));if(!filled.length||filled.length>200)throw Error('В файле должно быть от 1 до 200 строк.');
 const numbers=new Set(filled.map(r=>r.E).filter(Boolean)),authors=new Set(filled.map(r=>r.F).filter(Boolean));
 if(numbers.size>1||authors.size>1)throw Error('В одном файле смешаны разные операции или кабинеты.');
 const fileHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const integer=v=>/^\d+$/.test(String(v).trim())?Number(v):null;
 return {fileHash,operationNo:[...numbers][0]||'file-'+fileHash.slice(0,50),fileAuthor:[...authors][0]||'',rows:filled.map(r=>({row:r._row,id:integer(r.A),qty:integer(r.C),version:r.D||''}))};
}
