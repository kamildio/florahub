import {CONSENT_VERSION} from '../lib/maxiflora/registration.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {launchReadiness} from '../server/launch-readiness.mjs';
test('missing production settings cannot report launch readiness',()=>{
 const result=launchReadiness();
 assert.equal(result.readyForClients,false);
 assert.deepEqual(result.checks.find(x=>x.id==='database').missing,['MYSQL_HOST','MYSQL_DATABASE','MYSQL_USER','MYSQL_PASSWORD']);
 assert.equal(result.checks.find(x=>x.id==='production_mode').status,'blocked');
});
test('configured infrastructure never claims external services are connected or leaks secrets',()=>{
 const settings={MYSQL_HOST:'private-host',MYSQL_DATABASE:'private-db',MYSQL_USER:'private-user',MYSQL_PASSWORD:'private-password',TEST_MODE:'false',STAFF_OWNER_ACCOUNT_ID:'private-owner',STAFF_MFA_ENCRYPTION_KEY:'a'.repeat(64),MAINTENANCE_SECRET:'private-maintenance'};
 const result=launchReadiness(settings);
 assert.equal(result.readyForClients,false);
 for(const id of ['email','payments'])assert.equal(result.checks.find(x=>x.id===id).status,'not_connected');
 assert.equal(result.checks.find(x=>x.id==='owner_security').status,'requires_account_verification');
 assert.equal(result.checks.find(x=>x.id==='registration').status,'closed');
 const serialized=JSON.stringify(result);
 for(const value of Object.entries(settings).filter(([key])=>key!=='TEST_MODE').map(([,value])=>value))assert.equal(serialized.includes(value),false);
});

test('email registration readiness uses the current SMTP channel without requiring Telegram',()=>{const settings={SMTP_HOST:'pkz20.hoster.kz',SMTP_PORT:'465',SMTP_USER:'noreply@maxiflora.kz',SMTP_FROM:'noreply@maxiflora.kz',SMTP_PASSWORD:'private-password',EMAIL_AUTH_ENABLED:'true',EMAIL_CODE_SECRET:'x'.repeat(32),REGISTRATION_ENABLED:'true',LEGAL_APPROVED_VERSION:CONSENT_VERSION};const checks=launchReadiness(settings).checks;assert.equal(checks.find(x=>x.id==='email').status,'requires_delivery_verification');assert.equal(checks.find(x=>x.id==='registration').status,'requires_delivery_and_signup_verification');assert.equal(launchReadiness({...settings,EMAIL_CODE_SECRET:''}).checks.find(x=>x.id==='registration').status,'closed');});
