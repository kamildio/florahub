// Shared one-time code lifecycle for phone registration, login and recovery.
// Transport adapters must call markDelivered only after accepting delivery.
import {DomainError} from './engine.mjs';
const fail=(message,status=422)=>{throw new DomainError(message,status)};
const purposes=new Set(['register','login','reset-password']);
const hex=bytes=>Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const hash=async text=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))));
export function normalizePhone(value){let n=String(value||'').replace(/\D/g,'');if(n.length===11&&n[0]==='8')n='7'+n.slice(1);if(!/^77\d{9}$/.test(n))fail('Введите номер Казахстана: +7 7XX XXX XX XX.');return '+'+n;}
export function normalizeEmail(value){
 const email=typeof value==='string'?value.trim().toLowerCase():'';
 if(email.length>254||!/^[^\s@<>,;:"\\\x00-\x1f\x7f]+@[^\s@<>,;:"\\\x00-\x1f\x7f]+\.[^\s@<>,;:"\\\x00-\x1f\x7f]+$/.test(email))fail('Укажите корректный email.');
 return email;
}
const targetOf=(value,channel)=>channel==='email'?normalizeEmail(value):normalizePhone(value);
export function newCode(){
 // Rejection sampling avoids modulo bias in six-digit codes.
 let n;do{n=crypto.getRandomValues(new Uint32Array(1))[0]}while(n>=4294000000);
 return String(n%1000000).padStart(6,'0');
}
async function codeDigest(secret,id,code){
 if(typeof secret!=='string'||secret.length<32)fail('Подтверждение контакта ещё не настроено.',503);
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(id+':'+code))));
}
export async function makeChallenge({phone,email,purpose,browser,secret,channel='telegram'},now=Date.now()){
 if(!['telegram','whatsapp','email'].includes(channel)||!purposes.has(purpose)||typeof browser!=='string'||!/^[a-f0-9]{64}$/.test(browser))fail('Начните подтверждение заново.',400);
 const id=random(),code=newCode(),target=targetOf(channel==='email'?email:phone,channel);
 const record={id,phone:target,purpose,channel,browserHash:await hash(browser),digest:await codeDigest(secret,id,code),createdAt:now,expiresAt:now+(channel==='email'?600000:300000),resendAt:now+60000,attempts:0,status:'pending'};
 return {record,code};
}
export function storeChallenge(s,record,now=Date.now()){
 s.authChallenges=(s.authChallenges||[]).filter(x=>x.expiresAt>now);
 const previous=s.authChallenges.filter(x=>x.phone===record.phone).sort((a,b)=>b.createdAt-a.createdAt)[0];
 if(previous&&now<previous.resendAt)fail('Повторный код доступен через минуту.',429);
 s.authCodeRequests=(s.authCodeRequests||[]).filter(x=>x.at>now-3600000);
 if(s.authCodeRequests.filter(x=>x.phone===record.phone).length>=5)fail('Лимит кодов исчерпан. Попробуйте позже.',429);
 if(s.authChallenges.length>=1000||s.authCodeRequests.length>=5000)fail('Сервис занят. Попробуйте позже.',429);
 // A resend invalidates previous codes for this phone and purpose across browsers.
 for(const old of s.authChallenges)if(old.phone===record.phone&&old.purpose===record.purpose)old.status='superseded';
 s.authChallenges.push({...record});s.authCodeRequests.push({phone:record.phone,at:now});
 return {id:record.id,expiresAt:record.expiresAt,resendAt:record.resendAt};
}
export function markDelivered(s,id,now=Date.now()){
 const q=s.authChallenges?.find(x=>x.id===id);if(!q||q.status!=='pending'||q.expiresAt<=now)return false;q.status='sent';return true;
}
export function markDeliveryFailed(s,id){const q=s.authChallenges?.find(x=>x.id===id);if(q?.status==='pending')q.status='delivery-failed';}
export async function consumeCode(s,{id,phone,purpose,browser,code,secret,channel='telegram'},now=Date.now()){
 const q=s.authChallenges?.find(x=>x.id===id),invalid={ok:false,error:'Код недействителен или истёк. Запросите новый.'};
 if(!q||(q.channel||'telegram')!==channel||q.status!=='sent'||q.expiresAt<=now||q.purpose!==purpose||q.phone!==targetOf(phone,channel)||q.browserHash!==await hash(String(browser||'')))return invalid;
 if(q.attempts>=5)return {ok:false,error:'Лимит попыток исчерпан. Запросите новый код.'};
 q.attempts++;
 if(typeof code!=='string'||!/^\d{6}$/.test(code)||await codeDigest(secret,id,code)!==q.digest)return {ok:false,error:'Неверный код.'};
 q.status='consumed';q.consumedAt=now;
 return {ok:true,...(channel==='email'?{email:q.phone,account:q.account,challengeId:q.id}:{phone:q.phone}),purpose:q.purpose,channel:q.channel||'telegram',verifiedAt:now};
}
