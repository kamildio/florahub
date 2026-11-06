import test from 'node:test';
import assert from 'node:assert/strict';
import {whatsappConfigured,sendWhatsAppCode,WHATSAPP_CONSENT_VERSION} from '../lib/maxiflora/whatsapp-cloud.mjs';
import {phoneChannels,requirePhoneConsent,phoneCodeSecret} from '../lib/maxiflora/phone-channels.mjs';
const env={WHATSAPP_ENABLED:'true',WHATSAPP_CONSENT_APPROVED_VERSION:WHATSAPP_CONSENT_VERSION,WHATSAPP_ACCESS_TOKEN:'private-whatsapp-token-'.repeat(3),WHATSAPP_PHONE_NUMBER_ID:'123456789012345',WHATSAPP_API_VERSION:'v24.0',WHATSAPP_AUTH_TEMPLATE:'maxiflora_login_code',WHATSAPP_TEMPLATE_LANGUAGE:'ru'};
const message={phone:'+77060000000',code:'038492',id:'private-challenge'};
test('WhatsApp stays disabled until explicit activation, consent approval and all settings; Telegram remains available',()=>{
 assert.equal(whatsappConfigured(env),true);
 for(const key of Object.keys(env)){assert.equal(whatsappConfigured({...env,[key]:''}),false,key);}
 for(const patch of [{WHATSAPP_PHONE_NUMBER_ID:'123/evil'},{WHATSAPP_API_VERSION:'v24.0/evil'},{WHATSAPP_AUTH_TEMPLATE:'hello world'},{WHATSAPP_TEMPLATE_LANGUAGE:'ru/evil'}])assert.equal(whatsappConfigured({...env,...patch}),false);
 assert.deepEqual(phoneChannels({TELEGRAM_GATEWAY_TOKEN:'t'.repeat(40)}),{channels:{whatsapp:false,telegram:true},configured:true,preferred:'telegram'});
 assert.equal(phoneChannels({...env,TELEGRAM_GATEWAY_TOKEN:'t'.repeat(40)}).preferred,'whatsapp');
 assert.equal(phoneChannels({}).configured,false);
});
test('WhatsApp sends one authentication template to the fixed HTTPS host; no profile or challenge data leaves the site',async()=>{
 let calls=0;const result=await sendWhatsAppCode(message,env,async(url,options)=>{
  calls++;assert.equal(url,'https://graph.facebook.com/v24.0/123456789012345/messages');assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer '+env.WHATSAPP_ACCESS_TOKEN);
  const payload=JSON.parse(options.body);assert.deepEqual(payload,{messaging_product:'whatsapp',to:'77060000000',type:'template',template:{name:'maxiflora_login_code',language:{code:'ru'},components:[{type:'body',parameters:[{type:'text',text:'038492'}]},{type:'button',sub_type:'url',index:'0',parameters:[{type:'text',text:'038492'}]}]}});
  assert.equal(options.body.includes(message.id),false);return Response.json({messaging_product:'whatsapp',messages:[{id:'wamid.test'}]});
 });assert.equal(calls,1);assert.equal(result.providerRequestId,'wamid.test');
});
test('timeouts, rejection and malformed responses are sanitized, never retried or silently sent through Telegram',async()=>{
 for(const send of [async()=>{throw new Error(env.WHATSAPP_ACCESS_TOKEN)},async()=>Response.json({error:{message:env.WHATSAPP_ACCESS_TOKEN}},{status:400}),async()=>new Response('invalid'),async()=>new Response('x'.repeat(32769)),async()=>Response.json({messages:[{id:'x'}]}),async()=>Response.json({messaging_product:'whatsapp',messages:[{id:''}]})]){
  let calls=0;await assert.rejects(sendWhatsAppCode(message,env,async(...args)=>{calls++;return send(...args)}),e=>e.status===503&&!e.message.includes(env.WHATSAPP_ACCESS_TOKEN));assert.equal(calls,1);
 }
 let calls=0;await assert.rejects(sendWhatsAppCode(message,{},async()=>{calls++}));await assert.rejects(sendWhatsAppCode({...message,phone:'invalid'},env,async()=>{calls++}));assert.equal(calls,0);
});
test('channel consent cannot be substituted, and the existing Telegram HMAC key stays unchanged',()=>{
 assert.equal(requirePhoneConsent({telegramConsent:true}),'telegram');assert.equal(requirePhoneConsent({channel:'whatsapp',whatsappConsent:true}),'whatsapp');
 for(const input of [{channel:'whatsapp',telegramConsent:true},{channel:'telegram',whatsappConsent:true},{channel:'email',telegramConsent:true},{channel:'whatsapp',whatsappConsent:'true'}])assert.throws(()=>requirePhoneConsent(input));
 assert.equal(phoneCodeSecret({...env,TELEGRAM_GATEWAY_TOKEN:'legacy-key',AUTH_CODE_SECRET:'new-key'},'telegram'),'legacy-key');
 assert.equal(phoneCodeSecret({...env,AUTH_CODE_SECRET:'new-key'},'whatsapp'),'new-key');
});
