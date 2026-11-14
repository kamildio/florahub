const MAX_ATTEMPTS=8,LEASE=300000;
const state=o=>({status:o.status,cancel:o.cancelRequest?.time||null,proposal:o.proposal?JSON.stringify([o.proposal.by,o.proposal.recipient,o.proposal.items,o.proposal.arrival,o.proposal.pickupBy,o.proposal.address,o.proposal.assembled]):null});
export function initializeOrderMail(s){if(s.orderMail?.initialized)return;s.orderMail={initialized:true,jobs:[]};for(const o of s.orders||[])o.orderMailSeen=state(o);}
export function observeOrderMail(s,o,now){
 s.orderMail??={initialized:true,jobs:[]};const previous=o.orderMailSeen,current=state(o),events=[];
 const add=(type,accounts,title)=>events.push({type,accounts,title});
 if(!previous&&o.status==='new')add('new',[o.supplierId],'Поступил новый заказ');
 if(previous?.status!==o.status){if(o.status==='accepted')add('accepted',[o.buyerId],'Предзаказ принят поставщиком');if(o.status==='ready')add('ready',[o.buyerId],'Заказ готов к выдаче');if(o.status==='cancelled')add('cancelled',[o.buyerId,o.supplierId],'Заказ отменён');if(o.status==='unconfirmed')add('unconfirmed',[o.buyerId,o.supplierId],'Заказ не подтверждён в срок');if(o.status==='overdue')add('overdue',[o.buyerId],'Истёк срок получения заказа');}
 if(current.cancel&&current.cancel!==previous?.cancel)add('cancel-request',[o.supplierId],'Покупатель запросил отмену заказа');
 if(current.proposal&&current.proposal!==previous?.proposal)add('proposal',[o.proposal.recipient==='buyer'?o.buyerId:o.supplierId],'Нужно ответить на изменение заказа');
 for(const event of events)for(const accountId of new Set(event.accounts)){
  const p=s.profiles?.[accountId];if(!p?.verified||p.verificationMethod!=='email'||typeof p.email!=='string'||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(p.email))continue;
  const key=o.id+':'+o.version+':'+event.type+':'+accountId;if(s.orderMail.jobs.some(j=>j.key===key))continue;
  s.orderMail.jobs.push({id:crypto.randomUUID(),key,accountId,to:p.email.trim().toLowerCase(),orderId:o.id,type:event.type,title:event.title,proposal:current.proposal,status:'pending',attempts:0,createdAt:now,nextAt:now});
 }
 o.orderMailSeen=current;
}
function relevant(job,o){return o&&({new:()=>o.status==='new',accepted:()=>o.status==='accepted',ready:()=>['ready','overdue'].includes(o.status),overdue:()=>o.status==='overdue','cancel-request':()=>!!o.cancelRequest&&!['done','cancelled','unconfirmed'].includes(o.status),proposal:()=>state(o).proposal===job.proposal,cancelled:()=>o.status==='cancelled',unconfirmed:()=>o.status==='unconfirmed'}[job.type]?.()||false)}
export function claimOrderMail(s,now=Date.now(),excluded=[]){
 const jobs=s.orderMail?.jobs||[];
 // One in-flight message per account and order. Preserve ordering and prevent concurrent SMTP sends to it.
 for(const job of jobs){
  if(!['pending','sending'].includes(job.status))continue;
  const p=s.profiles?.[job.accountId],o=(s.orders||[]).find(x=>x.id===job.orderId);
  if(!p?.verified||p.verificationMethod!=='email'||p.email?.trim().toLowerCase()!==job.to||now-job.createdAt>3*86400000||!relevant(job,o)){job.status='skipped';job.finishedAt=now;continue}
  if(job.attempts>=MAX_ATTEMPTS&&job.status!=='sending'){job.status='failed';continue}
  if(excluded.includes(job.accountId+':'+job.orderId)||job.nextAt>now||jobs.some(j=>j!==job&&j.accountId===job.accountId&&j.orderId===job.orderId&&j.status==='sending'&&j.nextAt>now)||jobs.some(j=>j!==job&&j.accountId===job.accountId&&j.orderId===job.orderId&&['pending','sending'].includes(j.status)&&j.createdAt<job.createdAt))continue;
  if(job.attempts>=MAX_ATTEMPTS){job.status='failed';continue}
  job.status='sending';job.attempts++;job.lease=crypto.randomUUID();job.nextAt=now+LEASE;
  return {id:job.id,lease:job.lease,accountId:job.accountId,to:job.to,orderId:job.orderId,title:job.title};
 }
 return null;
}
export function finishOrderMail(s,claim,accepted,now=Date.now()){
 const job=s.orderMail?.jobs.find(j=>j.id===claim.id&&j.status==='sending'&&j.lease===claim.lease);if(!job)return false;
 if(accepted){job.status='sent';job.sentAt=now;delete job.error}else{job.status=job.attempts>=MAX_ATTEMPTS?'failed':'pending';job.error='SMTP_DELIVERY_FAILED';job.nextAt=now+Math.min(3600000,60000*2**(job.attempts-1))}delete job.lease;
 // Bound delivery history; never discard pending or failed work.
 s.orderMail.jobs=s.orderMail.jobs.filter(j=>!['sent','skipped'].includes(j.status)||(j.sentAt||j.finishedAt||j.createdAt)>now-30*86400000);return true;
}
export function orderMailView(s){const jobs=s.orderMail?.jobs||[];return {pending:jobs.filter(j=>['pending','sending'].includes(j.status)).length,failed:jobs.filter(j=>j.status==='failed').length,sent:jobs.filter(j=>j.status==='sent').length,errors:jobs.filter(j=>j.error).slice(-20).reverse().map(j=>({orderId:j.orderId,status:j.status,attempts:j.attempts,code:j.error,nextAt:j.status==='pending'?j.nextAt:null}))};}
