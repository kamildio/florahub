import {CONSENT_VERSION} from '../lib/maxiflora/registration.mjs';
// Configuration presence is not evidence of a working external integration.
// Only return fixed labels; never include environment values in diagnostics.
export function launchReadiness(settings={}) {
 const missing=['MYSQL_HOST','MYSQL_DATABASE','MYSQL_USER','MYSQL_PASSWORD'].filter(key=>!String(settings[key]||'').trim());
 const checks=[
  {id:'database',status:missing.length?'missing_configuration':'configured',missing},
  {id:'production_mode',status:settings.TEST_MODE==='false'?'configured':'blocked'},
  {id:'email',status:'not_connected'},
  {id:'payments',status:'not_connected'},
  {id:'registration',status:settings.REGISTRATION_ENABLED==='true'&&settings.LEGAL_APPROVED_VERSION===CONSENT_VERSION&&!!settings.TELEGRAM_GATEWAY_TOKEN?'requires_delivery_and_signup_verification':'closed'},
  {id:'operator_documents',status:settings.LEGAL_APPROVED_VERSION===CONSENT_VERSION?'approved_version_configured':'pending_approval'},
  {id:'owner_security',status:settings.STAFF_OWNER_ACCOUNT_ID&&/^[a-f0-9]{64}$/i.test(settings.STAFF_MFA_ENCRYPTION_KEY||'')?'requires_account_verification':'missing_configuration'},
  {id:'maintenance',status:settings.MAINTENANCE_SECRET?'requires_scheduler_verification':'missing_configuration'},
 ];
 return {readyForClients:false,checks};
}
