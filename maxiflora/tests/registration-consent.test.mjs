import test from 'node:test';import assert from 'node:assert/strict';
import {registrationConsentChoice as choice,registrationConsentChecked as checked,REGISTRATION_CHECKBOX_VERSION} from '../lib/maxiflora/registration-consent.mjs';
import {registrationDetails} from '../lib/maxiflora/registration.mjs';
const base={companyType:'IP',name:'Test Buyer',email:'buyer@example.test',phone:'+77060000000',password:'test-password',passwordConfirmation:'test-password',supplier:true,agreement:false,privacy:false,telegramConsent:false,whatsappConsent:false,marketing:false};
test('one explicit choice covers only service consents and the selected delivery channel; advertising remains off',()=>{
 for(const channel of ['telegram','whatsapp']){const accepted=choice(base,channel,true);assert.equal(checked(accepted,channel),true);assert.equal(checked(accepted,channel==='telegram'?'whatsapp':'telegram'),false);assert.equal(accepted.marketing,false);assert.equal(accepted.supplier,true);assert.equal(accepted.consentPresentation,REGISTRATION_CHECKBOX_VERSION);assert.equal(registrationDetails({...accepted,channel}).consentPresentation,REGISTRATION_CHECKBOX_VERSION);
 const revoked=choice(accepted,channel,false);assert.equal(checked(revoked,channel),false);assert.equal(revoked.agreement,false);assert.equal(revoked.privacy,false);assert.equal(revoked.telegramConsent,false);assert.equal(revoked.whatsappConsent,false);assert.throws(()=>registrationDetails({...revoked,channel}));}
});
test('new presentation cannot silently opt into marketing and legacy clients still validate',()=>{
 const accepted=choice(base,'telegram',true);assert.throws(()=>registrationDetails({...accepted,marketing:true}));assert.throws(()=>registrationDetails({...accepted,consentPresentation:'unknown'}));const legacy={...accepted};delete legacy.consentPresentation;legacy.marketing=true;assert.equal(registrationDetails(legacy).consentPresentation,'separate-checkboxes');
});
