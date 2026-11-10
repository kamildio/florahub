import test from 'node:test';import assert from 'node:assert/strict';
import {whatsappReadiness} from '../lib/maxiflora/whatsapp-readiness.mjs';
test('WhatsApp readiness distinguishes missing settings from activation without exposing secrets',()=>{
 const disabled=whatsappReadiness();assert.equal(disabled.configured,false);assert.equal(disabled.checks.every(c=>!c.ready),true);
 const env={WHATSAPP_ENABLED:'true',WHATSAPP_CONSENT_APPROVED_VERSION:'whatsapp-v1',WHATSAPP_ACCESS_TOKEN:'secret-token-'.repeat(4),WHATSAPP_PHONE_NUMBER_ID:'9876543210123',WHATSAPP_API_VERSION:'v24.0',WHATSAPP_AUTH_TEMPLATE:'private_template',WHATSAPP_TEMPLATE_LANGUAGE:'ru'};
 const configured=whatsappReadiness(env);assert.equal(configured.configured,true);assert.equal(configured.checks.every(c=>c.ready),true);assert.equal(configured.deliveryVerified,false);
 for(const value of [env.WHATSAPP_ACCESS_TOKEN,env.WHATSAPP_PHONE_NUMBER_ID,env.WHATSAPP_AUTH_TEMPLATE])assert.equal(JSON.stringify(configured).includes(value),false);
 const off=whatsappReadiness({...env,WHATSAPP_ENABLED:'false'});assert.equal(off.configured,false);assert.equal(off.checks.every(c=>c.ready),true);
});
