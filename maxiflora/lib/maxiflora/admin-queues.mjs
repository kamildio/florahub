import {requireStaffConfirmation} from './staff-security.mjs';
import {staffPermissions} from './staff-permissions.mjs';
import {DomainError} from './engine.mjs';
const openCase=c=>!['resolved','closed'].includes(c.status);
export function adminQueueView(s,u,ctx,now=Date.now()){
 const permissions=staffPermissions(s,u,ctx);if(!permissions.length)return {adminQueues:null};
 try{requireStaffConfirmation(s,u,ctx,{now,permission:permissions[0]})}catch(e){if(e instanceof DomainError)return {adminQueues:null};throw e}
 const counts={};
 if(permissions.includes('suppliers'))counts.suppliers=Object.values(s.profiles||{}).filter(p=>(p.supplier?p.supplierStatus:p.companyStatus)==='pending'||p.approved&&p.pendingBank).length;
 if(permissions.includes('billing'))counts.billing=(s.billing?.invoices||[]).filter(i=>i.status==='review').length;
 if(permissions.includes('ads'))counts.ads=(s.supplierBanners||[]).filter(b=>b.status==='pending'&&b.period===new Date(now+5*3600000).toISOString().slice(0,7)).length;
 if(permissions.includes('support'))counts.support=(s.supportCases||[]).filter(openCase).length;
 if(permissions.includes('moderation'))counts.moderation=(s.boardAds||[]).filter(a=>['pending','approved'].includes(a.status)).length+(s.boardReports||[]).filter(r=>r.status==='open').length;
 return {adminQueues:{counts,total:Object.values(counts).reduce((a,b)=>a+b,0)}};
}
// Add one owner notification per actionable event, including data created before this release.
// Read state stays intact; repeat polling and transport retries cannot duplicate notices.
export function syncAdminQueueNotifications(s,ownerId,now=Date.now()){
 if(!ownerId||!s.profiles?.[ownerId])return;
 s.notifications??=[];const existing=new Set(s.notifications.filter(n=>n.adminEvent).map(n=>n.adminEvent));
 const add=(event,section,text)=>{if(existing.has(event))return;existing.add(event);s.notifications.unshift({id:crypto.randomUUID(),users:[ownerId],target:'admin',adminSection:section,adminEvent:event,text,time:now})};
 for(const p of Object.values(s.profiles||{})){
  if((p.supplier?p.supplierStatus:p.companyStatus)==='pending')add('company:'+p.id+':'+(p.profileVersion||0),'suppliers','Компания '+(p.name||'без названия')+' ожидает проверки.');
  if(p.approved&&p.pendingBank)add('bank:'+p.id+':'+(p.profileVersion||0),'suppliers','Новые банковские реквизиты '+(p.name||'компании')+' ожидают проверки.');
 }
 for(const b of s.supplierBanners||[])if(b.status==='pending'&&b.period===new Date(now+5*3600000).toISOString().slice(0,7))add('banner:'+b.id,'ads','Новая заявка на баннер: '+b.title);
 for(const c of s.supportCases||[])if(openCase(c)){
  const message=c.messages?.findLast(m=>c.participants.includes(m.by));
  if(message)add('case:'+c.id+':'+message.id,'support','Обращение № '+c.number+': '+(c.subject||'вопрос по заказу')+'. Требуется ответ поддержки.');
 }
 for(const a of s.boardAds||[])if(['pending','approved'].includes(a.status))add('ad:'+a.id+':'+a.version,'moderation',a.status==='approved'?'Объявление «'+a.title+'» ожидает публикации.':'Объявление «'+a.title+'» ожидает модерации.');
 for(const r of s.boardReports||[])if(r.status==='open')add('report:'+r.id,'moderation','Новая жалоба на объявление «'+r.snapshot?.title+'».');
 for(const i of s.billing?.invoices||[])if(i.status==='review')add('invoice:'+i.id,'billing','Заявка на оплату '+i.number+' ожидает проверки.');
}

// Keep every actionable record visible even when older than the history window.
export function actionableWindow(items,isActionable,historyLimit=200){const active=items.filter(isActionable),history=items.filter(x=>!isActionable(x));return [...active,...history.slice(-historyLimit)];}
