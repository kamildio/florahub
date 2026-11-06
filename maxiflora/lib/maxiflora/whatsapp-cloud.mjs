import {DomainError} from './engine.mjs';
export const WHATSAPP_CONSENT_VERSION='whatsapp-v1';
// Explicit activation follows an approved authentication template and a real delivery check.
export function whatsappConfigured(env){
 return env.WHATSAPP_ENABLED==='true'&&env.WHATSAPP_CONSENT_APPROVED_VERSION===WHATSAPP_CONSENT_VERSION&&
 typeof env.WHATSAPP_ACCESS_TOKEN==='string'&&env.WHATSAPP_ACCESS_TOKEN.length>=32&&
 /^\d{5,30}$/.test(env.WHATSAPP_PHONE_NUMBER_ID||'')&&/^v\d{2}\.0$/.test(env.WHATSAPP_API_VERSION||'')&&
 /^[a-z0-9_]{1,128}$/.test(env.WHATSAPP_AUTH_TEMPLATE||'')&&/^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(env.WHATSAPP_TEMPLATE_LANGUAGE||'');
}
export const whatsappFailureMessage='Не удалось отправить код в WhatsApp. Попробуйте позже, выберите Telegram или войдите по паролю.';
export async function sendWhatsAppCode({phone,code},env,send=fetch){
 if(!whatsappConfigured(env))throw new DomainError('Отправка кодов в WhatsApp пока не подключена.',503);
 if(!/^\+77\d{9}$/.test(phone)||!/^\d{6}$/.test(code))throw new DomainError('Неверные данные подтверждения.',422);
 try{
  const response=await send(`https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,{
   method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:'Bearer '+env.WHATSAPP_ACCESS_TOKEN,'Content-Type':'application/json'},
   body:JSON.stringify({messaging_product:'whatsapp',to:phone.slice(1),type:'template',template:{name:env.WHATSAPP_AUTH_TEMPLATE,language:{code:env.WHATSAPP_TEMPLATE_LANGUAGE},components:[{type:'body',parameters:[{type:'text',text:code}]},{type:'button',sub_type:'url',index:'0',parameters:[{type:'text',text:code}]}]}})
  });
  const raw=await response.text();if(raw.length>32768)throw new Error();
  const result=JSON.parse(raw),id=result.messages?.[0]?.id;
  if(!response.ok||result.messaging_product!=='whatsapp'||typeof id!=='string'||!id||id.length>256)throw new Error();
  // API acceptance is not proof of handset delivery. Never retry a paid request automatically.
  return {providerRequestId:id};
 }catch{throw new DomainError(whatsappFailureMessage,503)}
}
