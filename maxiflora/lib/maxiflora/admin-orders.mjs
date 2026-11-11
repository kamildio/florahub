import {DomainError} from './engine.mjs';
import {requireStaffConfirmation} from './staff-security.mjs';
export const adminOrderStatuses=['new','accepted','ready','overdue','done','cancelled','unconfirmed'];
export function adminOrdersView(s,u,ctx,{query='',status='all',before,id}={},now=Date.now()){
 requireStaffConfirmation(s,u,ctx,{now});
 if(typeof query!=='string'||query.length>100||status!=='all'&&!adminOrderStatuses.includes(status)||before!==undefined&&(!Number.isSafeInteger(before)||before<1)||id!==undefined&&(!Number.isSafeInteger(id)||id<1))throw new DomainError('Проверьте фильтры заказов.',400);
 const project=o=>({id:o.id,buyer:o.buyer,supplier:o.supplier,city:o.city,status:o.status,created:o.created,transit:!!o.transit,arrival:o.arrival||null,responseBy:o.responseBy||null,pickupBy:o.pickupBy||null,version:o.version,hasProposal:!!o.proposal,cancelRequested:!!o.cancelRequest,items:o.items.map(x=>({name:x.name,qty:x.qty,pack:x.pack,price:x.price})),openCases:(s.supportCases||[]).filter(c=>c.orderId===o.id&&!['resolved','closed'].includes(c.status)).map(c=>({id:c.id,number:c.number,subject:c.subject,status:c.status}))});
 if(id!==undefined){const o=s.orders.find(x=>x.id===id);if(!o)throw new DomainError('Заказ не найден.',404);return {order:{...project(o),history:(o.history||[]).map(h=>({time:h.time,text:h.text}))}}}
 const search=query.trim().toLocaleLowerCase(),all=(s.orders||[]).filter(o=>(status==='all'||o.status===status)&&(!search||[o.id,o.buyer,o.supplier,o.city,...o.items.map(x=>x.name)].join(' ').toLocaleLowerCase().includes(search))).sort((a,b)=>b.id-a.id),matching=before===undefined?all:all.filter(o=>o.id<before),items=matching.slice(0,25);
 return {orders:items.map(project),total:all.length,nextBefore:matching.length>25?items.at(-1).id:null};
}
