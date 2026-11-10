import {whatsappConfigured,WHATSAPP_CONSENT_VERSION} from './whatsapp-cloud.mjs';
// Fixed identifiers and booleans only. Never return credentials, IDs or provider replies.
export function whatsappReadiness(env={}){
 const checks=[
  {id:'token',label:'Серверный доступ к WhatsApp',ready:typeof env.WHATSAPP_ACCESS_TOKEN==='string'&&env.WHATSAPP_ACCESS_TOKEN.length>=32},
  {id:'number',label:'Номер отправителя',ready:/^\d{5,30}$/.test(env.WHATSAPP_PHONE_NUMBER_ID||'')},
  {id:'api',label:'Версия API',ready:/^v\d{2}\.0$/.test(env.WHATSAPP_API_VERSION||'')},
  {id:'template',label:'Шаблон кода',ready:/^[a-z0-9_]{1,128}$/.test(env.WHATSAPP_AUTH_TEMPLATE||'')&&/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(env.WHATSAPP_TEMPLATE_LANGUAGE||'')},
  {id:'consent',label:'Условия подтверждения номера',ready:env.WHATSAPP_CONSENT_APPROVED_VERSION===WHATSAPP_CONSENT_VERSION},
 ];
 return {enabled:env.WHATSAPP_ENABLED==='true',configured:whatsappConfigured(env),checks,deliveryVerified:false};
}
