import test from 'node:test';import assert from 'node:assert/strict';
import {supplierIssues,submitSupplier,ibanValid} from '../lib/maxiflora/company-profile.mjs';
import {publicSuppliers} from '../lib/maxiflora/business.mjs';
import {seed,apply,processTimers} from '../lib/maxiflora/engine.mjs';
import {supplierAdminView,supplierAdminAction} from '../lib/maxiflora/supplier-admin.mjs';
import {staffSecurityAction,totp} from '../lib/maxiflora/staff-security.mjs';
const now=Date.parse('2026-11-04T12:00:00+05:00'),owner={id:'owner',email:'owner@example.test',verified:true,verificationMethod:'email'};
function iban(body='0000000000000001'){let mod=0;for(const c of body+'203500')mod=(mod*10+Number(c))%97;return 'KZ'+String(98-mod).padStart(2,'0')+body;}
const supplier=()=>({id:'seller',supplier:true,approved:false,complete:true,companyType:'IP',name:'ИП Тест',contact:'Закрытое ФИО',phone:'+77000000001',email:'seller@example.test',city:'Шымкент',legalAddress:'Тестовый юридический адрес',address:'Тестовый адрес склада',bin:'000000000000',bank:iban(),supplierStatus:'draft',profileVersion:0});
async function context(){const p=supplier(),s={profiles:{seller:p,owner},notifications:[],products:[]},ctx={ownerId:'owner',workspace:'live',testMode:false,encryptionKey:'ab'.repeat(32),sessionId:'1'.repeat(64),authenticatedAt:now,sessionExpires:now+1000000};const start=await staffSecurityAction(s,owner,{action:'begin'},ctx,now);await staffSecurityAction(s,owner,{action:'confirm',setupId:start.setupId,code:await totp(start.secret,now)},ctx,now);return {s,p,ctx};}
test('registered draft and closed personal name never enter the public supplier list',()=>{const p=supplier(),s={profiles:{seller:p},orders:[],reviews:[]};p.name=p.contact;assert.equal(publicSuppliers(s).length,0);p.approved=true;p.complete=false;assert.equal(publicSuppliers(s).length,0);p.name='ИП Тест';p.complete=true;assert.equal(publicSuppliers(s)[0].name,'ИП Тест');assert.equal(publicSuppliers(s)[0].contact,undefined);});
test('submission checks legal form, mandatory supplier fields, IBAN checksum and exact version',()=>{const p=supplier();assert.equal(ibanValid(p.bank),true);assert.equal(ibanValid(p.bank.slice(0,-1)+'2'),false);assert.deepEqual(supplierIssues(p),[]);assert.throws(()=>submitSupplier(p,10,now),e=>e.status===409);assert.ok(supplierIssues({...p,companyType:'PERSON',bank:'KZ00BAD',bin:'12'}).length>=3);submitSupplier(p,0,now);assert.equal(p.supplierStatus,'pending');assert.equal(p.approved,false);assert.throws(()=>submitSupplier(p,1,now),e=>e.status===409);});
test('real supplier review requires designated owner, MFA, current version and a reason',async()=>{const {s,p,ctx}=await context();submitSupplier(p,0,now);const b={action:'approve',id:p.id,profileVersion:1,reason:'Реквизиты и компания проверены'};assert.throws(()=>supplierAdminAction(s,{...owner,id:'intruder'},b,ctx,now),e=>e.status===403);assert.throws(()=>supplierAdminAction(s,owner,b,{...ctx,sessionId:'2'.repeat(64)},now),e=>e.status===401);assert.throws(()=>supplierAdminAction(s,owner,b,ctx,now+300001),e=>e.status===401);assert.throws(()=>supplierAdminAction(s,owner,{...b,reason:''},ctx,now),e=>e.status===422);supplierAdminAction(s,owner,b,ctx,now);assert.equal(p.approved,true);assert.equal(p.supplierStatus,'approved');assert.equal(s.supplierAdminAudit.length,1);assert.throws(()=>supplierAdminAction(s,owner,b,ctx,now),e=>e.status===409);assert.equal(supplierAdminView(s,owner,ctx,now).suppliers[0].id,p.id);});
test('editing a pending profile invalidates the old review version and requires resubmission',async()=>{const {s,p,ctx}=await context();submitSupplier(p,0,now);apply(s,p,{action:'profile',name:'ИП Новое название'},now+1);assert.equal(p.supplierStatus,'draft');assert.equal(p.approved,false);assert.throws(()=>supplierAdminAction(s,owner,{action:'approve',id:p.id,profileVersion:1,reason:'Проверено'},ctx,now+2),e=>e.status===409);});
test('bank changes preserve the current approved account until a fresh privileged decision',async()=>{const {s,p,ctx}=await context();submitSupplier(p,0,now);supplierAdminAction(s,owner,{action:'approve',id:p.id,profileVersion:1,reason:'Компания проверена'},ctx,now);const original=p.bank,version=p.profileVersion;
assert.throws(()=>apply(s,p,{action:'profile',bank:'KZ00INVALID'},now+1),e=>e.status===422);
assert.equal(p.profileVersion,version);assert.equal(p.bank,original);assert.equal(p.pendingBank,undefined);
const replacement=iban('0000000000000002');
apply(s,p,{action:'profile',bank:replacement},now+1);
assert.equal(p.bank,original);assert.equal(p.pendingBank,replacement);assert.equal(p.approved,true);
supplierAdminAction(s,owner,{action:'bank-approve',id:p.id,profileVersion:p.profileVersion,reason:'Проверено'},ctx,now+2);
assert.equal(p.pendingBank,undefined);assert.equal(p.bank,replacement);});
test('supplier save rejects missing mandatory details without partial changes; buyer remains optional',()=>{
 for(const key of ['bin','legalAddress','address','bank']){
  const p=supplier(),s={profiles:{seller:p},products:[],orders:[],receipts:{}},before=JSON.stringify(p);
  assert.throws(()=>apply(s,p,{action:'profile',[key]:'',name:'New company'},now),e=>e.status===422);
  assert.equal(JSON.stringify(p),before);
 }
 const p={...supplier(),supplier:false,approved:false,bin:'',bank:'',legalAddress:'',address:''};
 const s={profiles:{seller:p},products:[],orders:[],receipts:{}};
 apply(s,p,{action:'profile',name:'Buyer company'},now);
 assert.equal(p.name,'Buyer company');
});


test('legacy personal-name repair preserves trial and legal-company edits and runs only once',()=>{const s=seed(now),p={id:'legacy',name:'Personal name',contact:'',approved:false,complete:false,consent:{name:'Personal name'},trialStarted:now,trialEnds:now+1000};s.profiles.legacy=p;s.profiles.edited={...p,id:'edited',name:'Company name'};s.profiles.approved={...p,id:'approved',approved:true};processTimers(s,now);assert.equal(p.name,'');assert.equal(p.contact,'Personal name');assert.equal(p.trialStarted,now);assert.equal(p.trialEnds,now+1000);assert.equal(p.profileVersion,1);assert.equal(s.profiles.edited.name,'Company name');assert.equal(s.profiles.approved.name,'Personal name');processTimers(s,now);assert.equal(p.profileVersion,1);});

test('buyer company review requires legal identity and email, then enables checkout and invalidates on legal edits',async()=>{
 const {s,ctx}=await context();
 const p={...supplier(),id:'buyer-company',supplier:false,approved:false,companyApproved:false,companyStatus:'draft',verified:true,verificationMethod:'email',bank:'',address:''};
 s.profiles[p.id]=p;
 const {submitBuyer,companyApproved,buyerIssues}=await import('../lib/maxiflora/company-profile.mjs');
 assert.deepEqual(buyerIssues(p,s),[]);
 assert.equal(companyApproved(p),false);
 assert.throws(()=>apply(s,p,{action:'checkout',items:[]},now),e=>e.status===403);
 const invalid={...p,companyType:'PERSON'};assert.throws(()=>submitBuyer(invalid,0,now,s),e=>e.status===422);
 assert.throws(()=>submitBuyer({...p,verified:false},0,now,s),e=>e.status===422);
 submitBuyer(p,0,now,s);
 const b={action:'approve',id:p.id,profileVersion:1,reason:'Company verified'};
 assert.throws(()=>supplierAdminAction(s,owner,b,{...ctx,sessionId:'other'},now),e=>e.status===401);
 supplierAdminAction(s,owner,b,ctx,now);
 assert.equal(companyApproved(p),true);
 assert.equal(p.approved,false);
 const view=supplierAdminView(s,owner,ctx,now);
 assert.equal(view.buyers.find(x=>x.id===p.id).approved,true);
 assert.throws(()=>supplierAdminAction(s,owner,b,ctx,now),e=>e.status===409);
 apply(s,p,{action:'profile',legalAddress:'Updated legal address 2'},now+1);
 assert.equal(companyApproved(p),false);assert.equal(p.companyStatus,'draft');
 submitBuyer(p,p.profileVersion,now+2,s);
 supplierAdminAction(s,owner,{action:'reject',id:p.id,profileVersion:p.profileVersion,reason:'Correct legal details'},ctx,now+2);
 assert.equal(p.companyStatus,'rejected');assert.equal(p.companyReview.reason,'Correct legal details');
 submitBuyer(p,p.profileVersion,now+3,s);assert.equal(p.companyStatus,'pending');
});
