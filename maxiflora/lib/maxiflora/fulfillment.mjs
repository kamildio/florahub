import {DomainError,terminal,amount} from './engine.mjs';
const fail=(text,status=422)=>{throw new DomainError(text,status)};
export const composition=o=>JSON.stringify({address:o.address,arrival:o.arrival,items:o.items.map(x=>({pid:x.pid,qty:x.qty,pack:x.pack,price:x.price}))});
export function assemblyView(s,u,id){
 const sheet=(s.assemblySheets||[]).find(x=>x.id===id);
 if(!sheet||sheet.supplierId!==u.id)fail('Сборочный лист недоступен.',403);
 const staleOrders=sheet.orders.filter(saved=>{const o=s.orders.find(o=>o.id===saved.id);return !o||terminal(o)||!!o.proposal||composition(o)!==saved.composition;}).map(x=>x.id);
 const buyerIds=new Set(sheet.orders.map(o=>o.buyerId)),selected=new Set(sheet.orders.map(o=>o.id));
 const additions=s.orders.filter(o=>o.supplierId===u.id&&buyerIds.has(o.buyerId)&&!selected.has(o.id)&&!terminal(o)&&o.created>=sheet.created).map(o=>o.id);
 return {...sheet,stale:staleOrders.length>0,staleOrders,additions};
}
export function createAssembly(s,u,body,now=Date.now()){
 if(!u.supplier)fail('Сборочные листы доступны поставщику.',403);
 if(!Array.isArray(body.orders)||!body.orders.length||body.orders.length>100)fail('Выберите от 1 до 100 заказов.');
 if(new Set(body.orders.map(x=>x.id)).size!==body.orders.length)fail('Заказ выбран повторно.');
 const orders=body.orders.map(row=>{const o=s.orders.find(x=>x.id===row.id);if(!o||o.supplierId!==u.id)fail('Один из заказов недоступен.',403);if(o.version!==row.version)fail('Заказ № '+o.id+' изменился. Обновите список.',409);if(terminal(o)||o.proposal||o.cancelRequest)fail('Заказ № '+o.id+' завершён или требует согласования.');return o;});
 const sheet={id:crypto.randomUUID(),supplierId:u.id,created:now,orders:orders.map(o=>({id:o.id,buyer:o.buyer,buyerId:o.buyerId,composition:composition(o),status:o.status,transit:o.transit,arrival:o.arrival,address:o.address,items:o.items.map(i=>({...i})),sum:amount(o)})),lines:[],progress:{}};
 const lines=new Map();
 for(const o of orders){for(const x of o.items){const key=String(x.pid)+'|'+x.pack+'|'+(o.transit?o.arrival:'stock');if(!lines.has(key))lines.set(key,{key,pid:x.pid,name:x.name,pack:x.pack,qty:0,transit:o.transit,arrival:o.arrival,orders:[]});const line=lines.get(key);line.qty+=x.qty;line.orders.push({id:o.id,buyer:o.buyer,qty:x.qty,price:x.price});}}
 sheet.lines=[...lines.values()];s.assemblySheets??=[];s.assemblySheets.unshift(sheet);return {id:sheet.id};
}
export function setAssemblyProgress(s,u,body){
 const view=assemblyView(s,u,body.sheetId);if(view.stale)fail('Лист устарел. Создайте новый по актуальному составу.',409);
 const sheet=s.assemblySheets.find(x=>x.id===body.sheetId),line=sheet.lines.find(x=>x.key===body.key);
 if(!line||!Number.isSafeInteger(body.qty)||body.qty<0||body.qty>line.qty)fail('Укажите собранное количество от 0 до '+(line?.qty||0)+'.');
 sheet.progress[line.key]=body.qty;return {id:sheet.id};
}
export function buyerGroups(orders){
 const groups=new Map();for(const o of orders){if(!groups.has(o.buyerId))groups.set(o.buyerId,{id:o.buyerId,name:o.buyer,orders:[],active:0,ready:0,attention:0,next:null});const g=groups.get(o.buyerId);g.orders.push(o);if(!terminal(o)){g.active++;if(o.status==='ready')g.ready++;if(o.status==='new'||o.cancelRequest||o.status==='overdue'||o.proposal?.recipient==='supplier')g.attention++;const due=o.proposal?.deadline||(o.status==='new'?o.responseBy:o.pickupBy);if(due)g.next=g.next===null?due:Math.min(g.next,due);}}
 return [...groups.values()].sort((a,b)=>(a.next??Infinity)-(b.next??Infinity)||a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
}
export async function batchReady(s,u,body,transition,now=Date.now()){
 const view=assemblyView(s,u,body.sheetId);if(view.stale)fail('Лист устарел. Создайте новый по актуальному составу.',409);
 if(view.lines.some(line=>(view.progress[line.key]||0)!==line.qty))fail('Сначала отметьте фактически собранное количество по всем строкам.');
 const ready=[],problems=[],before=s.notifications.length;
 for(const row of view.orders){const o=s.orders.find(x=>x.id===row.id);try{transition(s,u,{action:'ready',id:o.id,version:o.version},now);ready.push(o.id)}catch(e){if(!(e instanceof DomainError))throw e;problems.push({id:o.id,error:e.message});}}
 const created=s.notifications.splice(0,s.notifications.length-before);
 const buyers=new Map();for(const n of created){const o=s.orders.find(x=>x.id===n.orderId);if(!buyers.has(o.buyerId))buyers.set(o.buyerId,[]);buyers.get(o.buyerId).push(o.id);}
 for(const [buyer,ids] of buyers)s.notifications.unshift({id:crypto.randomUUID(),users:[buyer,u.id],orderId:ids[0],orderIds:ids,text:'Готовы к выдаче заказы: '+ids.map(id=>'№ '+id).join(', ')+'. Для каждого действует собственный срок получения.',time:now});
 return {ready,problems};
}
