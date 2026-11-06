import {DomainError} from './engine.mjs';
import {gatewayFailureReason,gatewayFailureMessage} from './telegram-feedback.mjs';
export const gatewayConfigured=env=>typeof env.TELEGRAM_GATEWAY_TOKEN==='string'&&env.TELEGRAM_GATEWAY_TOKEN.length>=32;
export async function sendGatewayCode({phone,code,id},env,send=fetch){
 if(!gatewayConfigured(env))throw new DomainError('Отправка кодов ещё не подключена.',503);
 let response;
 try{response=await send('https://gatewayapi.telegram.org/sendVerificationMessage',{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Authorization':'Bearer '+env.TELEGRAM_GATEWAY_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({phone_number:phone,code,ttl:300,payload:id})})}catch{throw new DomainError('Не удалось отправить код. Повторите позже.',503)}
 const raw=await response.text();if(raw.length>32768)throw new DomainError('Сервис кодов временно недоступен.',503);
 let result;try{result=JSON.parse(raw)}catch{throw new DomainError('Сервис кодов временно недоступен.',503)}
 if(!response.ok||result.ok!==true||typeof result.result?.request_id!=='string'||result.result.request_id.length>256){const reason=gatewayFailureReason(result.error,response.status),error=new DomainError(gatewayFailureMessage(reason),503);error.gatewayReason=reason;throw error;}
 return {providerRequestId:result.result.request_id};
}
