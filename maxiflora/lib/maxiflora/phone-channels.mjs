import {DomainError} from './engine.mjs';
import {gatewayConfigured,sendGatewayCode} from './telegram-gateway.mjs';
import {whatsappConfigured,sendWhatsAppCode,WHATSAPP_CONSENT_VERSION} from './whatsapp-cloud.mjs';
import {TELEGRAM_CONSENT_VERSION} from './privacy-policy.mjs';
export function phoneChannel(value){const channel=value===undefined?'telegram':value;if(!['telegram','whatsapp'].includes(channel))throw new DomainError('Выберите WhatsApp или Telegram.',422);return channel;}
export function phoneChannels(env){const channels={whatsapp:whatsappConfigured(env),telegram:gatewayConfigured(env)};return {channels,configured:channels.whatsapp||channels.telegram,preferred:channels.whatsapp?'whatsapp':'telegram'};}
// Preserve legacy Telegram challenge keys, including codes sent immediately before an update.
export function phoneCodeSecret(env,channel){return channel==='telegram'?env.TELEGRAM_GATEWAY_TOKEN:(env.AUTH_CODE_SECRET||env.WHATSAPP_ACCESS_TOKEN);}
export function requirePhoneConsent(input){const channel=phoneChannel(input.channel);if(input[channel+'Consent']!==true)throw new DomainError('Подтвердите отдельное согласие на передачу номера и кода '+(channel==='whatsapp'?'WhatsApp.':'Telegram.'),422);return channel;}
export function channelConsentVersion(channel){return channel==='whatsapp'?WHATSAPP_CONSENT_VERSION:TELEGRAM_CONSENT_VERSION;}
export const phoneMethod=channel=>phoneChannel(channel)==='whatsapp'?'whatsapp-cloud':'telegram-gateway';
export const verifiedPhoneMethod=method=>['telegram-gateway','whatsapp-cloud'].includes(method);
export const sendPhoneCode=(message,env,channel)=>channel==='whatsapp'?sendWhatsAppCode(message,env):sendGatewayCode(message,env);
