import assert from 'node:assert/strict';
import {randomUUID,randomInt} from 'node:crypto';
const base=process.env.MAXIFLORA_TEST_URL||'http://127.0.0.1:5173',workspace='stage2-'+randomUUID();
const headers={'Content-Type':'application/json',Origin:base,'x-maxiflora-test-workspace':workspace};
let checks=0;
const check=s=>{checks++;console.log('✓ '+s)};
async function call(path,body,cookie='',expected=200){const r=await fetch(base+'/api/platform/'+path,{headers:{...headers,...(cookie?{Cookie:cookie}:{})},...(body?{method:'POST',body:JSON.stringify(body)}:{})});const data=await r.json();assert.equal(r.status,expected,JSON.stringify(data));return {data,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
async function act(cookie,b,expected=200){return call('action',{...b,operationId:randomUUID()},cookie,expected)}
const profile={bin:'000000000000',legalAddress:'Synthetic legal address 1',companyType:'IP',name:'Test studio',contact:'Test owner',city:'Шымкент',email:'owner-'+randomUUID()+'@example.test'};
const password='Test-'+randomUUID(),phone='+7702'+String(randomInt(1000000,9999999));
const user=(await call('register',{phone,password,agreement:true,privacy:true},'',201)).cookie;
await act(user,{action:'profile',...profile});await act(user,{action:'email-send'});const state=(await call('state',null,user)).data;assert.equal(state.mailbox.length,1);assert.equal(state.mailbox[0].to,profile.email);assert.match(state.mailbox[0].code,/^\d{6}$/);check('A new account can request a test email addressed to its saved profile');
const supplier=(await call('demo',{role:'supplier'})).cookie;assert.equal((await call('state?mode=supplier',null,supplier)).data.mailbox.length,0);assert.equal((await call('state')).data.mailbox.length,0);check('Verification code is absent from other accounts and anonymous responses');
await act(user,{action:'email-send'},429);check('Repeated code delivery is rate limited');
assert.equal((await act(user,{action:'email-verify',code:'not-code'})).data.ok,false);assert.equal((await call('state',null,user)).data.profile.verified,false);check('Incorrect code does not verify a profile');
assert.equal((await act(user,{action:'email-verify',code:state.mailbox[0].code})).data.ok,true);assert.equal((await call('state',null,user)).data.profile.verified,true);assert.equal((await act(user,{action:'email-verify',code:state.mailbox[0].code})).data.ok,false);check('Correct code verifies only once');
await act(user,{action:'checkout',items:[{pid:1,qty:50,price:7000,pack:25}]},403);
const savedBefore=(await call('state',null,user)).data.profile;
await act(user,{action:'profile',submitForReview:true,saveDraft:false,profileVersion:savedBefore.profileVersion,bin:'123',name:'Invalid uncommitted change'},422);
assert.equal((await call('state',null,user)).data.profile.name,savedBefore.name);
await act(user,{action:'profile',submitForReview:true,saveDraft:false,profileVersion:savedBefore.profileVersion});

const {totp}=await import('../lib/maxiflora/staff-security.mjs');
const setup=(await call('staff-security',{action:'begin'},supplier)).data;
await call('staff-security',{action:'confirm',setupId:setup.setupId,code:await totp(setup.secret)},supplier);
const buyerProfile=(await call('state',null,user)).data.profile;
await call('supplier-admin',{action:'approve',id:buyerProfile.id,profileVersion:buyerProfile.profileVersion,reason:'Synthetic company check'},supplier);
check('Verified buyer cannot order before company review; owner MFA approval enables purchases');
const a=(await act(user,{action:'checkout',items:[{pid:1,qty:50,price:7000,pack:25}]})).data.results[0].orderId;
const b=(await act(user,{action:'checkout',items:[{pid:1,qty:25,price:7000,pack:25}]})).data.results[0].orderId;
let st=(await call('state?mode=supplier',null,supplier)).data;
const ids=[a,b],payload={action:'assembly-create',orders:st.orders.filter(o=>ids.includes(o.id)).map(o=>({id:o.id,version:o.version})),operationId:randomUUID()};const [x,y]=await Promise.all([call('action',payload,supplier),call('action',payload,supplier)]);assert.deepEqual(x.data,y.data);st=(await call('state?mode=supplier',null,supplier)).data;assert.equal(st.assemblySheets.length,1);assert.equal(st.assemblySheets[0].lines[0].qty,75);check('A verified test buyer can order; concurrent sheet retries create one combined sheet');
assert.equal((await call('state?mode=supplier',null,user)).data.assemblySheets.length,0);await act(user,{action:'assembly-progress',sheetId:x.data.id,key:st.assemblySheets[0].lines[0].key,qty:75},403);check('Buyer cannot see or change supplier assembly records');
await act(supplier,{action:'assembly-ready',sheetId:x.data.id},422);await act(supplier,{action:'assembly-progress',sheetId:x.data.id,key:st.assemblySheets[0].lines[0].key,qty:75});const ready=(await act(supplier,{action:'assembly-ready',sheetId:x.data.id})).data;assert.equal(ready.ready.length,2);st=(await call('state?mode=supplier',null,supplier)).data;assert.equal(st.products.find(p=>p.id===1).total,1030);assert.equal(st.products.find(p=>p.id===1).reserved,75);check('Batch readiness requires collection marks and preserves physical inventory');
const buyerState=(await call('state',null,user)).data;assert.equal(buyerState.notifications.filter(n=>n.orderIds?.length===2).length,1);await act(user,{action:'notifications-read'});assert.ok((await call('state',null,user)).data.notifications.every(n=>n.read));assert.equal((await call('state',null,user)).data.orders[0].status,'ready');check('One grouped notification is delivered per buyer and reading leaves orders unchanged');
const order=st.orders.find(o=>o.id===a);await act(supplier,{action:'cancel',id:a,version:order.version,reason:'Test cancellation'});st=(await call('state?mode=supplier',null,supplier)).data;assert.equal(st.assemblySheets[0].stale,true);await act(supplier,{action:'assembly-progress',sheetId:x.data.id,key:st.assemblySheets[0].lines[0].key,qty:25},409);check('Cancellation invalidates the saved sheet and prevents editing stale collection marks');
await act(user,{action:'profile',...profile,email:'new-'+randomUUID()+'@example.test'});assert.equal((await call('state',null,user)).data.profile.verified,false);check('Changing email requires new verification');
const unauthorized=await fetch(base+'/api/platform/maintenance',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(unauthorized.status,403);const maintenance=await fetch(base+'/api/platform/maintenance',{method:'POST',headers:{'Content-Type':'application/json','x-maxiflora-maintenance':'local-maintenance-test-only'},body:'{}'});assert.equal(maintenance.status,200);assert.ok((await maintenance.json()).checked>0);check('Maintenance requires its own secret and runs without a browser session');
console.log('Stage two API: '+checks+' checks passed.');
