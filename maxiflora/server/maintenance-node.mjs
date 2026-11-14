import {readFile,writeFile,rename,open,stat,unlink} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
const endpoint='https://www.maxiflora.kz/api/platform/maintenance';
export async function maintenancePass(secret,send=fetch,deadline=Date.now()+90000){
 if(typeof secret!=='string'||secret.length<32)throw new Error('MAINTENANCE_KEY_MISSING');
 let after='',checked=0,changed=0;
 for(let page=0;page<1000;page++){
  if(Date.now()>=deadline)throw new Error('MAINTENANCE_TIME_LIMIT');
  const response=await send(endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{'Content-Type':'application/json','x-maxiflora-maintenance':secret},body:JSON.stringify({after})});
  if(!response.ok)throw new Error('MAINTENANCE_HTTP_'+response.status);
  const text=await response.text();if(text.length>65536)throw new Error('MAINTENANCE_RESPONSE_INVALID');
  const data=JSON.parse(text);
  if(!Number.isSafeInteger(data.checked)||!Number.isSafeInteger(data.changed)||data.checked<0||data.checked>100||data.changed<0||data.changed>data.checked||data.next!==null&&(typeof data.next!=='string'||!data.next||data.next.length>200||data.next<=after))throw new Error('MAINTENANCE_RESPONSE_INVALID');
  checked+=data.checked;changed+=data.changed;if(data.next===null)return {checked,changed,pages:page+1};after=data.next;
 }throw new Error('MAINTENANCE_PAGE_LIMIT');
}
export function maintenanceAlert(previous,current){
 const now=current.completedAt;
 const due=!current.ok&&(!previous||previous.ok||previous.error!==current.error||!Number.isFinite(previous.alertedAt)||now-previous.alertedAt>=3600000);
 return {...current,alertedAt:current.ok?null:due?now:previous.alertedAt,alert:due?current.error:current.ok&&previous?.ok===false?'MAINTENANCE_RECOVERED':null};
}
async function main(){
 const root=new URL('../',import.meta.url),lock=new URL('.maintenance-lock',root),status=new URL('.maintenance-status.json',root);let handle;
 try{try{const old=await stat(lock);if(Date.now()-old.mtimeMs<600000)return;await unlink(lock)}catch(e){if(e.code!=='ENOENT')throw e}handle=await open(lock,'wx',0o600)}catch(e){if(e.code==='EEXIST')return;throw e}
 const startedAt=Date.now();let result,previous;try{previous=JSON.parse(await readFile(status,'utf8'))}catch{}
 try{const secret=(await readFile(new URL('.maintenance-key',root),'utf8')).trim();result={ok:true,startedAt,completedAt:Date.now(),...await maintenancePass(secret)};result.completedAt=Date.now()}
 catch(e){result={ok:false,startedAt,completedAt:Date.now(),error:/^MAINTENANCE_[A-Z0-9_]+$/.test(e.message||'')?e.message:'MAINTENANCE_UNAVAILABLE'};process.exitCode=1}
 finally{await handle.close();await unlink(lock).catch(()=>{})}
 result=maintenanceAlert(previous,result);
 const temporary=new URL('.maintenance-status-'+process.pid+'.tmp',root);await writeFile(temporary,JSON.stringify(result),{mode:0o600});await rename(temporary,status);
 if(result.alert)console.error(result.alert);
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)main().catch(()=>{console.error('MAINTENANCE_START_FAILED');process.exitCode=1});
