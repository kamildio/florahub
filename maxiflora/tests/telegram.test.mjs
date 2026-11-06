import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,SignJWT} from 'jose';
import {telegramConfigured,newTelegramFlow,telegramAuthorization,saveTelegramFlow,consumeTelegramFlow,verifyTelegramToken,telegramAccount,TELEGRAM_CALLBACK} from '../lib/maxiflora/telegram.mjs';
const now=1800000000000;
test('configuration must include ID and secret, authorization has fixed target and PKCE',async()=>{
 assert.equal(telegramConfigured({TELEGRAM_CLIENT_ID:'9110754685'}),false);
 const flow=await newTelegramFlow({},now);const url=new URL(await telegramAuthorization(flow,'9110754685'));
 assert.equal(url.origin,'https://oauth.telegram.org');assert.equal(url.searchParams.get('redirect_uri'),TELEGRAM_CALLBACK);assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.notEqual(url.searchParams.get('code_challenge'),flow.verifier);assert.equal(url.searchParams.get('scope'),'openid');
});
test('flow is browser-bound, expires, and is consumed once',async()=>{
 const flow=await newTelegramFlow({},now),s={};saveTelegramFlow(s,flow,now);
 assert.throws(()=>consumeTelegramFlow(s,flow.state,'b'.repeat(64),now));
 assert.equal(consumeTelegramFlow(s,flow.state,flow.browser,now).state,flow.state);
 assert.throws(()=>consumeTelegramFlow(s,flow.state,flow.browser,now));
 saveTelegramFlow(s,flow,now);assert.throws(()=>consumeTelegramFlow(s,flow.state,flow.browser,flow.expires));
});
test('linking cannot steal another account or create an account implicitly',()=>{
 const s={profiles:{a:{id:'a'},b:{id:'b'}}};
 assert.throws(()=>telegramAccount(s,'123',{mode:'login'},now));
 assert.equal(telegramAccount(s,'123',{mode:'link',account:'a'},now),'a');
 assert.throws(()=>telegramAccount(s,'123',{mode:'link',account:'b'},now));
 assert.throws(()=>telegramAccount(s,'456',{mode:'link',account:'a'},now));
 assert.equal(telegramAccount(s,'123',{mode:'login'},now),'a');
 assert.deepEqual(Object.keys(s.profiles),['a','b']);
});
test('signed tokens reject wrong issuer, audience, nonce, expired tokens and another key',async()=>{
 const {publicKey,privateKey}=await generateKeyPair('RS256');
 const sign=(claims={})=>new SignJWT({nonce:'expected',...claims}).setProtectedHeader({alg:'RS256'}).setIssuer('https://oauth.telegram.org').setAudience('9110754685').setSubject('12345').setIssuedAt(now/1000).setExpirationTime(now/1000+300).sign(privateKey);
 const token=await sign();assert.equal(await verifyTelegramToken(token,'9110754685','expected',publicKey,now),'12345');
 await assert.rejects(verifyTelegramToken(token,'other','expected',publicKey,now));
 await assert.rejects(verifyTelegramToken(token,'9110754685','wrong',publicKey,now));
 await assert.rejects(verifyTelegramToken(token,'9110754685','expected',publicKey,now+400000));
 const other=await generateKeyPair('RS256');await assert.rejects(verifyTelegramToken(token,'9110754685','expected',other.publicKey,now));
 const badIssuer=await new SignJWT({nonce:'expected'}).setProtectedHeader({alg:'RS256'}).setIssuer('https://evil.example').setAudience('9110754685').setSubject('12345').setIssuedAt(now/1000).setExpirationTime(now/1000+300).sign(privateKey);
 await assert.rejects(verifyTelegramToken(badIssuer,'9110754685','expected',publicKey,now));
});
