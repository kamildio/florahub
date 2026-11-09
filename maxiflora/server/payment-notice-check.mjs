import {telegramCurl} from './telegram-transport.mjs';
// Explicit CLI-only smoke test. Credentials stay on the server; output is fixed and redacted.
import {readFile,writeFile,rename} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export async function checkPaymentBot(settings,send=fetch){
 const token=settings.PAYMENTS_BOT_TOKEN,chat=settings.PAYMENTS_CHAT_ID;
 if(!/^\d{6,16}:[A-Za-z0-9_-]{20,}$/.test(token||''))return {ok:false,error:'BOT_TOKEN_MISSING_OR_INVALID'};
 if(!/^\d{5,20}$/.test(chat||''))return {ok:false,error:'RECIPIENT_ID_MISSING_OR_INVALID'};
 const call=async(method,body)=>{const r=await send('https://api.telegram.org/bot'+token+'/'+method,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'content-type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok||data.ok!==true){const description=String(data.description||'').toLowerCase();throw new Error(r.status===401?'BOT_TOKEN_REJECTED':r.status===403?'BOT_BLOCKED_OR_NOT_STARTED':description.includes('chat not found')?'RECIPIENT_CHAT_NOT_FOUND':'TELEGRAM_REQUEST_FAILED')}return data.result};
 let stage='getMe';
 try{
  const bot=await call('getMe',{});if(bot.username?.toLowerCase()!=='maxiflora_oficial_bot')return {ok:false,error:'UNEXPECTED_BOT'};
  stage='getChat';const recipient=await call('getChat',{chat_id:chat});if(recipient.type!=='private'||String(recipient.id)!==chat)return {ok:false,error:'RECIPIENT_NOT_PRIVATE'};
  stage='sendMessage';const sent=await call('sendMessage',{chat_id:chat,text:'MaXiFlora · Проверка уведомлений\nТест подключения прошёл: бот может отправлять вам заявки на проверку оплаты.\nЭто тестовое сообщение, не заявка и не подтверждение оплаты. Приём платежей этим тестом не включается.',link_preview_options:{is_disabled:true}});
  if(String(sent.chat?.id)!==chat||!Number.isSafeInteger(sent.message_id))return {ok:false,error:'DELIVERY_NOT_CONFIRMED'};
  return {ok:true,bot:'MaXiFlora_Oficial_bot',privateRecipientVerified:true,telegramAccepted:true,paymentsEnabled:settings.MANUAL_PAYMENTS_ENABLED==='true'};
 }catch(e){return {ok:false,stage,networkCode:['ENOTFOUND','ETIMEDOUT','ECONNRESET','ECONNREFUSED','UND_ERR_CONNECT_TIMEOUT','CERT_HAS_EXPIRED','UNABLE_TO_VERIFY_LEAF_SIGNATURE'].includes(e.cause?.code||e.code)?(e.cause?.code||e.code):null,error:['BOT_TOKEN_REJECTED','BOT_BLOCKED_OR_NOT_STARTED','TELEGRAM_REQUEST_FAILED','TELEGRAM_CURL_TIMEOUT','TELEGRAM_CURL_UNAVAILABLE','TELEGRAM_CURL_FAILED','RECIPIENT_CHAT_NOT_FOUND'].includes(e.message)?e.message:'TELEGRAM_UNAVAILABLE'}}
}
async function main(){
 if(!process.argv.includes('--send-test')){console.error('EXPLICIT_SEND_TEST_REQUIRED');process.exitCode=1;return}
 let result;try{const config=new URL('../.payments-private.env',import.meta.url);process.loadEnvFile(config);const recipient=process.argv.find(x=>x.startsWith('--recipient='))?.slice(12);if(recipient){if(!/^\d{5,20}$/.test(recipient))throw new Error('INVALID_RECIPIENT');process.env.PAYMENTS_CHAT_ID=recipient;}result=await checkPaymentBot(process.env,process.argv.includes('--curl')?telegramCurl:fetch);if(result.ok&&recipient){const previous=await readFile(config,'utf8');const updated=/^PAYMENTS_CHAT_ID=.*$/m.test(previous)?previous.replace(/^PAYMENTS_CHAT_ID=.*$/m,'PAYMENTS_CHAT_ID='+recipient):previous+'\nPAYMENTS_CHAT_ID='+recipient+'\n';const temp=new URL('../.payments-private.tmp',import.meta.url);await writeFile(temp,updated,{mode:0o600});await rename(temp,config)}}catch{result={ok:false,error:'PRIVATE_CONFIGURATION_UNAVAILABLE'}}
 const status={...result,checkedAt:new Date().toISOString()};await writeFile(new URL('../.payments-test-status.json',import.meta.url),JSON.stringify(status),{mode:0o600});console.log(JSON.stringify(status));if(!status.ok)process.exitCode=1;
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)main().catch(()=>{console.error('TEST_CHECK_FAILED');process.exitCode=1});
