import {blank,seed,processTimers,DomainError} from './engine.mjs';
export async function loadState(db,id){
 await db.prepare('INSERT OR IGNORE INTO workspaces (id,revision,state) VALUES (?,0,?)').bind(id,JSON.stringify(id.startsWith('sandbox:')?seed():blank())).run();
 return db.prepare('SELECT * FROM workspaces WHERE id=?').bind(id).first();
}
export async function mutateState(db,id,fn,now){
 for(let i=0;i<8;i++){
  const row=await loadState(db,id),s=JSON.parse(row.state),time=now??Date.now();processTimers(s,time);const result=await fn(s,time);
  const before=JSON.parse(row.state),profiles=Object.values(s.profiles||{}).filter(p=>JSON.stringify(p)!==JSON.stringify(before.profiles?.[p.id]));
  const r=db.commitWorkspaceState?await db.commitWorkspaceState({id,revision:row.revision,state:JSON.stringify(s),profiles}):await db.prepare('UPDATE workspaces SET state=?,revision=revision+1 WHERE id=? AND revision=?').bind(JSON.stringify(s),id,row.revision).run();
  if(r.meta.changes===1)return {s,result,revision:row.revision+1};
 }
 throw new DomainError('Данные изменяются другим устройством. Повторите действие.',409);
}
export async function runTimers(db,{after='',limit=100,now=Date.now()}={}){
 const rows=await db.prepare('SELECT id FROM workspaces WHERE id>? ORDER BY id LIMIT ?').bind(after,limit).all();
 let changed=0;
 for(const row of rows.results){
  for(let i=0;i<8;i++){
   const record=await db.prepare('SELECT revision,state FROM workspaces WHERE id=?').bind(row.id).first();if(!record)break;
   const s=JSON.parse(record.state);if(!processTimers(s,now))break;
   const before=JSON.parse(record.state),profiles=Object.values(s.profiles||{}).filter(p=>JSON.stringify(p)!==JSON.stringify(before.profiles?.[p.id]));
   const result=db.commitWorkspaceState?await db.commitWorkspaceState({id:row.id,revision:record.revision,state:JSON.stringify(s),profiles}):await db.prepare('UPDATE workspaces SET state=?,revision=revision+1 WHERE id=? AND revision=?').bind(JSON.stringify(s),row.id,record.revision).run();
   if(result.meta.changes===1){changed++;break;}if(i===7)throw new DomainError('Требуется повтор обработки сроков.',409);
  }
 }
 return {checked:rows.results.length,changed,next:rows.results.length===limit?rows.results.at(-1).id:null,time:now};
}
