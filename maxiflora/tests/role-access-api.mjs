// Isolated synthetic eight-role access audit; no production credentials.
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {pathToFileURL} from 'node:url';
import {createHash,randomBytes} from 'node:crypto';
const source=new URL('../',import.meta.url);
register(new URL('tests/fixtures/acceptance-loader.mjs',source));
const {env}=await import(new URL('tests/fixtures/acceptance-runtime.mjs',source));
const {GET,POST}=await import(new URL('app/api/platform/[...path]/route.js',source));
const {seed}=await import(new URL('lib/maxiflora/engine.mjs',source));
const {totp}=await import(new URL('lib/maxiflora/staff-security.mjs',source));
const origin='https://maxtest.invalid', now=Date.now();
Object.assign(env,{TEST_MODE:'false',MANUAL_PAYMENTS_ENABLED:'true'});
const s=seed(now), identities={owner:'demo-supplier',buyer:'demo-buyer',supplier:'audit-supplier',content:'audit-content',support:'audit-support',moderator:'audit-moderator',billing:'audit-billing'};
for(const [role,id] of Object.entries(identities)){
 s.profiles[id]={...s.profiles[id],id,name:role,verified:true,verificationMethod:'email',email:role+'@example.test',supplier:['owner','supplier'].includes(role),approved:true,plan:'MAX',planUntil:now+86400000};
}
await env.DB.prepare('INSERT INTO workspaces(id,revision,state) VALUES(?,0,?)').bind('live',JSON.stringify(s)).run();
const cookies={};
for(const [role,id] of Object.entries(identities)){
 const token=randomBytes(32).toString('hex');
 cookies[role]='maxiflora_session='+token;
 await env.DB.prepare('INSERT INTO sessions(token,account,workspace,expires) VALUES(?,?,?,?)').bind(createHash('sha256').update(token).digest('hex'),id,'live',now+604800000).run();
}
async function call(role,path,body){
 const r=new Request(origin+'/api/platform/'+path,{method:body?'POST':'GET',headers:{origin,'content-type':'application/json',cookie:cookies[role]||''},...(body?{body:JSON.stringify(body)}:{})});
 const response=await (body?POST:GET)(r);
 return {status:response.status,data:await response.json()};
}
async function check(role,path,body,status){
 const r=await call(role,path,body);
 assert.equal(r.status,status,JSON.stringify({role,path,expected:status,...r}));
 return r.data;
}
async function mfa(role){
 const setup=await check(role,'staff-security',{action:'begin'},200);
 await check(role,'staff-security',{action:'confirm',setupId:setup.setupId,code:await totp(setup.secret)},200);
}
const op=body=>({...body,operationId:crypto.randomUUID()});
const staff=['content','support','moderator','billing'];
const expected={
 guest:[],buyer:[],supplier:[],
 owner:['owner','content','catalog','support','moderation','suppliers','ads','billing','settings','staff','monitoring'],
 content:['content','catalog'],support:['support'],moderator:['moderation','ads'],billing:['billing']
};
const surfaces={homeContentAdmin:'content',catalogAdmin:'catalog',billingAdmin:'billing',platformSettingsAdmin:'settings'};
const writes={
 'home-content':['content','save'], 'catalog-admin':['catalog','category-save'], 'platform-settings':['settings','save'],
 'billing-admin':['billing','grant'], 'supplier-admin':['suppliers','approve']
};
assert.equal((await check('owner','state',null,200)).operationsAdmin,null);
await mfa('owner');
for(const role of staff){
 await check('owner','operations',op({action:'staff-save',accountId:identities[role],role,version:0,reason:'QA role assignment'}),200);
 assert.equal((await check(role,'state',null,200)).operationsAdmin,null);
 await mfa(role);
}
const outcomes=[];
for(const [role,permissions] of Object.entries(expected)){
 const view=await check(role,'state',null,200);
 assert.deepEqual(view.operationsAdmin?.permissions||[],permissions,role);
 for(const [key,permission] of Object.entries(surfaces))assert.equal(!!view[key],permissions.includes(permission),role+' '+key);
 for(const [key,permission] of Object.entries({cases:'support',banners:'ads',members:'staff'}))assert.equal(!!view.operationsAdmin?.[key],permissions.includes(permission),role+' '+key);
 await check(role,'monitoring',null,role==='owner'?200:role==='guest'?401:403);
 await check(role,'admin-orders',null,role==='owner'?200:role==='guest'?401:403);
 if(!permissions.length)assert.equal(view.adminQueues,null);else assert.ok(view.adminQueues);
 for(const [path,[permission,action]] of Object.entries(writes)){
  if(!permissions.includes(permission))await check(role,path,op({action}),role==='guest'?401:403);
 }
 if(role!=='owner')await check(role,'operations',op({action:'staff-save',accountId:identities.billing,role:'billing',version:0,reason:'denial test'}),role==='guest'?401:403);
 outcomes.push({role,permissions});
}
const banner=await check('supplier','operations',op({action:'banner-submit',title:'QA banner',description:'QA test',asset:'roses',days:3,startsAt:Date.now()}),200);
await check('support','operations',op({action:'banner-approve',id:banner.id,version:1,reason:'QA attempt'}),403);
await check('moderator','operations',op({action:'banner-approve',id:banner.id,version:1,reason:'QA approved'}),200);
const issue=await check('buyer','operations',op({action:'case-new',topic:'general',subject:'QA issue',text:'QA request'}),200);
await check('moderator','operations',op({action:'case-update',id:issue.id,version:1,status:'resolved',visibility:'shared',text:'QA answer'}),403);
await check('support','operations',op({action:'case-update',id:issue.id,version:1,status:'resolved',visibility:'shared',text:'QA answer'}),200);
assert.equal((await check('buyer','state',null,200)).cases[0].status,'resolved');
for(const role of staff){
 await check('owner','operations',op({action:'staff-revoke',accountId:identities[role],version:1,reason:'QA revoke'}),200);
 assert.equal((await check(role,'state',null,200)).operationsAdmin,null);
}
console.log(JSON.stringify({roles:outcomes,mfa:true,revocation:true,bannerModeration:true,supportResolution:true}));
