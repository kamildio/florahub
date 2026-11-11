import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {registrationDetails,createVerifiedAccount,restoreAccountProfile,CONSENT_VERSION} from '../lib/maxiflora/registration.mjs';
import {PRIVACY_VERSION} from '../lib/maxiflora/privacy-policy.mjs';
import {seed,apply} from '../lib/maxiflora/engine.mjs';
import {addAlmatyMonths} from '../lib/maxiflora/subscriptions.mjs';
const now=Date.parse('2026-11-03T12:00:00+05:00');
const input={companyType:'IP',phone:'8 (706) 000-00-00',name:'  Клиент  ',email:' HELLO@example.test ',password:'long-password',passwordConfirmation:'long-password',agreement:true,privacy:true,telegramConsent:true,marketing:false,supplier:true,approved:true,verified:true,role:'admin',plan:'Business'};
const proof={ok:true,phone:'+77060000000',purpose:'register',verifiedAt:now};
const password=async value=>'hashed:'+value;
function db(){const raw=new DatabaseSync(':memory:');raw.exec('CREATE TABLE accounts(id TEXT PRIMARY KEY,phone TEXT UNIQUE,email TEXT UNIQUE,password TEXT,profile TEXT)');return {prepare(sql){const stmt=raw.prepare(sql);return {bind(...params){return {first:async()=>stmt.get(...params)||null,run:async()=>({meta:{changes:stmt.run(...params).changes}})}}}},raw};}
test('signup validates trimmed contacts, repeated password and explicit consents before a paid code',()=>{
 const d=registrationDetails(input);assert.equal(d.phone,proof.phone);assert.equal(d.email,'hello@example.test');assert.equal(d.name,'Клиент');
 for(const bad of [{companyType:'PERSON'},{companyType:''},{companyType:undefined},{agreement:'true'},{telegramConsent:false},{marketing:'yes'},{privacy:1},{passwordConfirmation:'other'},{name:'\n'},{email:'x'},{password:'short',passwordConfirmation:'short'}])assert.throws(()=>registrationDetails({...input,...bad}));
});
test('verified signup persists one phone, hashed password, consent and one MAX month without granting staff/seller approval',async()=>{
 const database=db(),a=await createVerifiedAccount(database,input,proof,password,now),stored=await database.prepare('SELECT * FROM accounts WHERE phone=?').bind(proof.phone).first(),p=JSON.parse(stored.profile);
 assert.equal(stored.id,a.id);assert.equal(stored.password,'hashed:long-password');assert.equal(p.companyType,'IP');assert.equal(p.companyApproved,false);assert.equal(p.name,'');assert.equal(p.contact,'Клиент');assert.equal(p.phoneVerified,true);assert.equal(p.verified,false);assert.equal(p.approved,false);assert.equal(p.role,undefined);assert.equal(p.plan,'MAX');assert.equal(p.planUntil,addAlmatyMonths(now,1));assert.equal(p.consent.agreement,CONSENT_VERSION);assert.equal(p.consent.privacy,PRIVACY_VERSION);
 assert.equal(stored.profile.includes('long-password'),false);
 await assert.rejects(createVerifiedAccount(database,input,proof,password,now),e=>e.status===409);assert.equal(database.raw.prepare('SELECT count(*) AS n FROM accounts').get().n,1);
});
test('parallel signup requests cannot create two accounts or two trials for the same phone',async()=>{
 const database=db(),results=await Promise.allSettled([createVerifiedAccount(database,input,proof,password,now),createVerifiedAccount(database,input,proof,password,now)]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(results.filter(x=>x.status==='rejected'&&x.reason.status===409).length,1);
});
test('registration rejects a wrong-purpose, wrong-phone, unverified, expired or future proof',async()=>{
 const database=db();for(const patch of [{ok:false},{purpose:'login'},{phone:'+77061111111'},{verifiedAt:now-300001},{verifiedAt:now+1}])await assert.rejects(createVerifiedAccount(database,input,{...proof,...patch},password,now),e=>e.status===403);
 assert.equal(database.raw.prepare('SELECT count(*) AS n FROM accounts').get().n,0);
});
test('failed account write leaves no workspace identity; a later login repairs a failed workspace write without renewing the trial',async()=>{
 const database=db();await assert.rejects(createVerifiedAccount(database,input,proof,async()=>{throw new Error('hash unavailable')},now));assert.equal(database.raw.prepare('SELECT count(*) AS n FROM accounts').get().n,0);
 const a=await createVerifiedAccount(database,input,proof,password,now),s={profiles:{}},p=restoreAccountProfile(s,a),until=p.planUntil;
 p.name='Edited company';restoreAccountProfile(s,a);assert.equal(s.profiles[a.id].name,'Edited company');assert.equal(s.profiles[a.id].planUntil,until);
 const repaired={profiles:{}};assert.equal(restoreAccountProfile(repaired,a).planUntil,until);
 assert.throws(()=>restoreAccountProfile({profiles:{}},{...a,phone:'+77061111111'}));
});
test('a phone-verified buyer can order without a fake email verification; spoofed profile updates cannot grant proof',()=>{
 const s=seed(now),u=s.profiles['demo-buyer'];u.verified=false;u.phoneVerified=true;u.phoneVerificationMethod='telegram-gateway';
 const result=apply(s,u,{action:'checkout',items:[{pid:1,qty:25,price:7000,pack:25}]},now);assert.ok(result.results[0].orderId);
 u.phoneVerified=false;apply(s,u,{action:'profile',phoneVerified:true,phoneVerificationMethod:'telegram-gateway'},now);assert.equal(u.phoneVerified,false);assert.throws(()=>apply(s,u,{action:'checkout',items:[{pid:1,qty:25,price:7000,pack:25}]},now),e=>e.status===403);
 u.phoneVerified=true;u.phoneVerificationMethod='sandbox';assert.throws(()=>apply(s,u,{action:'checkout',items:[{pid:1,qty:25,price:7000,pack:25}]},now),e=>e.status===403);
});
test('different phones cannot register the same normalized email, including a concurrent race',async()=>{
 const database=db(),second={...input,phone:'+77061111111',email:'hello@EXAMPLE.TEST'};
 const results=await Promise.allSettled([createVerifiedAccount(database,input,proof,password,now),createVerifiedAccount(database,second,{...proof,phone:second.phone},password,now)]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(results.filter(x=>x.status==='rejected'&&x.reason.status===409).length,1);assert.equal(database.raw.prepare('SELECT count(*) AS n FROM accounts').get().n,1);
});
test('WhatsApp signup records the actual proof channel and separate consent without Telegram consent or approval escalation',async()=>{
 const database=db(),wa={...input,channel:'whatsapp',telegramConsent:false,whatsappConsent:true},waProof={...proof,channel:'whatsapp'};
 await assert.rejects(createVerifiedAccount(database,wa,proof,password,now),e=>e.status===403);
 const account=await createVerifiedAccount(database,wa,waProof,password,now),p=JSON.parse(account.profile);
 assert.equal(p.phoneVerificationMethod,'whatsapp-cloud');assert.equal(p.telegramConsent,undefined);assert.equal(p.whatsappConsent.accepted,true);assert.equal(p.consent.phoneMethod,'whatsapp-cloud');assert.equal(p.consentHistory[1].kind,'whatsapp');assert.equal(p.marketingConsent.enabled,false);assert.equal(p.approved,false);assert.equal(p.role,undefined);
 const s=seed(now),u=s.profiles['demo-buyer'];u.verified=false;u.phoneVerified=true;u.phoneVerificationMethod='whatsapp-cloud';assert.ok(apply(s,u,{action:'checkout',items:[{pid:1,qty:25,price:7000,pack:25}]},now).results[0].orderId);
});
test('combined checkbox keeps a versioned audit for each purpose and does not subscribe a new account to marketing',async()=>{
 const {registrationConsentChoice,REGISTRATION_CHECKBOX_VERSION}=await import('../lib/maxiflora/registration-consent.mjs');const database=db(),chosen=registrationConsentChoice(input,'telegram',true),account=await createVerifiedAccount(database,chosen,proof,password,now),p=JSON.parse(account.profile);
 assert.equal(p.consent.presentation,REGISTRATION_CHECKBOX_VERSION);assert.equal(p.telegramConsent.presentation,REGISTRATION_CHECKBOX_VERSION);assert.equal(p.marketingConsent.enabled,false);assert.equal(p.consentHistory[0].accepted,true);assert.equal(p.consentHistory[1].accepted,true);assert.equal(p.consentHistory[2].enabled,false);
});
