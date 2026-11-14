import {buyerIssues,supplierIssues,companyApproved} from './company-profile.mjs';
import {stockPublicationActive} from './offer-publication.mjs';
const terminal=new Set(['done','cancelled','unconfirmed']);
export function accountReadiness(s,u,now=Date.now()){
 if(!u)return {accountReadiness:null};
 const build=selling=>{
  const approved=selling?u.approved===true:companyApproved(u),issues=approved?[]:(selling?supplierIssues:buyerIssues)(u,s),status=(u.supplier?u.supplierStatus:u.companyStatus)||'draft',review=u.supplier?u.supplierReview:u.companyReview;
  const orders=(s.orders||[]).filter(o=>selling?o.supplierId===u.id:o.buyerId===u.id),access=!!u.plan&&u.planUntil>now,published=(s.products||[]).filter(p=>p.supplierId===u.id&&p.published&&stockPublicationActive(p,now)).length;
  const steps=[{id:'email',done:u.verified===true},{id:'details',done:approved||issues.length===0},{id:'approval',done:approved,waiting:!approved&&status==='pending'},...(selling?[{id:'access',done:access},{id:'offer',done:published>0}]:[{id:'order',done:orders.length>0}])];
  const next=steps.find(x=>!x.done),stage=!approved&&status==='rejected'&&next?.id!=='email'?'corrections':next?.id==='approval'?(status==='pending'?'pending':status==='rejected'?'corrections':'submit'):next?.id||'complete';
  return {steps,completed:steps.filter(x=>x.done).length,total:steps.length,stage,issues,reason:!approved&&status==='rejected'?review?.reason||null:null,activeOrders:orders.filter(o=>!terminal.has(o.status)).length,needsReply:orders.filter(o=>!terminal.has(o.status)&&(selling?o.status==='new'||o.cancelRequest||o.proposal?.recipient==='supplier':o.proposal?.recipient==='buyer')).length};
 };
 return {accountReadiness:{buying:build(false),selling:u.supplier?build(true):null,openCases:(s.supportCases||[]).filter(c=>c.participants.includes(u.id)&&!['resolved','closed'].includes(c.status)).length}};
}
