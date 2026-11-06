import test from 'node:test';
import assert from 'node:assert/strict';
import {gatewayConfigured,sendGatewayCode} from '../lib/maxiflora/telegram-gateway.mjs';
const env={TELEGRAM_GATEWAY_TOKEN:'test-private-token-'.repeat(3)};
test('gateway uses POST, fixed HTTPS, TTL and bearer header without token in URL',async()=>{
 assert.equal(gatewayConfigured({}),false);let call;
 const result=await sendGatewayCode({phone:'+77000000000',code:'123456',id:'test-id'},env,async(url,options)=>{call={url,options};return Response.json({ok:true,result:{request_id:'request-1',remaining_balance:100}})});
 assert.deepEqual(result,{providerRequestId:'request-1'});assert.equal(call.url,'https://gatewayapi.telegram.org/sendVerificationMessage');assert.equal(call.options.method,'POST');assert.equal(call.options.redirect,'error');assert.equal(call.options.headers.Authorization,'Bearer '+env.TELEGRAM_GATEWAY_TOKEN);assert.deepEqual(JSON.parse(call.options.body),{phone_number:'+77000000000',code:'123456',ttl:300,payload:'test-id'});
});
test('errors do not disclose provider response or credentials; transport does not retry paid sends',async()=>{
 let attempts=0;await assert.rejects(sendGatewayCode({phone:'+77000000000',code:'123456',id:'x'},env,async()=>{attempts++;return Response.json({ok:false,error:env.TELEGRAM_GATEWAY_TOKEN},{status:401})}),error=>!error.message.includes(env.TELEGRAM_GATEWAY_TOKEN));assert.equal(attempts,1);
 await assert.rejects(sendGatewayCode({},{}));
});
