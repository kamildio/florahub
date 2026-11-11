// Production auth handler, synthetic SQLite accounts and mocked external transports only.
import assert from 'node:assert/strict';
import {register} from 'node:module';
register('./fixtures/acceptance-loader.mjs',import.meta.url);
const {env}=await import('./fixtures/acceptance-runtime.mjs');
const {GET,POST}=await import('../app/api/platform/[...path]/route.js');
Object.assign(env,{TEST_MODE:'false',TELEGRAM_GATEWAY_TOKEN:'test-telegram-'.repeat(4),REGISTRATION_ENABLED:'true',LEGAL_APPROVED_VERSION:'launch-v3',WHATSAPP_ENABLED:'true',WHATSAPP_CONSENT_APPROVED_VERSION:'whatsapp-v1',WHATSAPP_ACCESS_TOKEN:'test-whatsapp-'.repeat(4),WHATSAPP_PHONE_NUMBER_ID:'123456789012345',WHATSAPP_API_VERSION:'v24.0',WHATSAPP_AUTH_TEMPLATE:'maxiflora_login_code',WHATSAPP_TEMPLATE_LANGUAGE:'ru'});
await env.DB.prepare('ALTER TABLE accounts ADD COLUMN email TEXT').run();await env.DB.prepare('CREATE UNIQUE INDEX accounts_email ON accounts(email)').run();
const origin='https://www.maxiflora.test';let calls=0,code='',transportFailure=false,cookie='';
const original=globalThis.fetch;
globalThis.fetch=async(url,options)=>{calls++;assert.equal(url,'https://graph.facebook.com/v24.0/123456789012345/messages');code=JSON.parse(options.body).template.components[0].parameters[0].text;return transportFailure?Response.json({error:{message:'secret-provider-error'}},{status:400}):Response.json({messaging_product:'whatsapp',messages:[{id:'wamid.test'}]});};
async function post(path,body,session=cookie){return POST(new Request(origin+'/api/platform/'+path,{method:'POST',headers:{origin,'content-type':'application/json',cookie:session},body:JSON.stringify(body)}));}
const details={companyType:'IP',channel:'whatsapp',phone:'+77060000001',name:'Synthetic Buyer',email:'buyer@example.test',password:'synthetic-password',passwordConfirmation:'synthetic-password',agreement:true,privacy:true,whatsappConsent:true,telegramConsent:false,marketing:false,purpose:'register',operationId:crypto.randomUUID()};
try{
 const state=await (await GET(new Request(origin+'/api/platform/state'))).json();assert.equal(state.phoneAuth.preferred,'whatsapp');assert.equal(state.phoneAuth.registration,true);assert.equal(JSON.stringify(state).includes(env.WHATSAPP_ACCESS_TOKEN),false);
 assert.equal((await post('auth-code-send',{...details,whatsappConsent:false})).status,422);assert.equal(calls,0);
 const sent=await post('auth-code-send',details);assert.equal(sent.status,200);const challenge=await sent.json();assert.equal(challenge.channel,'whatsapp');cookie=sent.headers.get('set-cookie').split(';')[0];assert.equal(calls,1);
 const replay=await post('auth-code-send',details);assert.equal(replay.status,200);assert.equal((await replay.json()).id,challenge.id);assert.equal(calls,1);
 assert.equal((await post('auth-code-send',{...details,channel:'telegram',telegramConsent:true})).status,409);assert.equal(calls,1);
 assert.equal((await post('auth-code-verify',{...details,id:challenge.id,code,channel:'telegram',telegramConsent:true})).status,422);
 assert.equal((await post('auth-code-verify',{...details,id:challenge.id,code:'wrong'})).status,422);
 const verified=await post('auth-code-verify',{...details,id:challenge.id,code});assert.equal(verified.status,200);const session=verified.headers.get('set-cookie').split(';')[0];
 const account=await env.DB.prepare('SELECT * FROM accounts WHERE phone=?').bind(details.phone).first();const profile=JSON.parse(account.profile);assert.equal(profile.phoneVerificationMethod,'whatsapp-cloud');assert.equal(profile.whatsappConsent.accepted,true);assert.equal(profile.telegramConsent,undefined);assert.equal(profile.marketingConsent.enabled,false);assert.notEqual(account.password,details.password);
 assert.equal((await post('auth-code-verify',{...details,id:challenge.id,code})).status,422);
 const signed=await (await GET(new Request(origin+'/api/platform/state',{headers:{cookie:session}}))).json();assert.equal(signed.authenticated,true);
 // Independent phone proves that failed/uncertain paid requests cannot be replayed as success.
 transportFailure=true;const failedDetails={...details,phone:'+77060000002',email:'other@example.test',operationId:crypto.randomUUID()};
 const failed=await post('auth-code-send',failedDetails);assert.equal(failed.status,503);assert.equal((await failed.text()).includes('secret-provider-error'),false);assert.equal(calls,2);
 const failedReplay=await post('auth-code-send',failedDetails);assert.equal(failedReplay.status,503);assert.equal(calls,2);
 env.WHATSAPP_ENABLED='false';const disabled=await (await GET(new Request(origin+'/api/platform/state'))).json();assert.equal(disabled.phoneAuth.preferred,'telegram');assert.equal(disabled.phoneAuth.registration,true);
 assert.equal((await post('auth-code-send',{...failedDetails,operationId:crypto.randomUUID()})).status,503);assert.equal(calls,2);
 console.log('Phone auth API: production signup, channel binding, consent, replay safety, sessions and disabled-channel fallback passed.');
}finally{globalThis.fetch=original;}
