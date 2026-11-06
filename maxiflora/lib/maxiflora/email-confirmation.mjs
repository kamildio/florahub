import {DomainError} from './engine.mjs';
import {newCode} from './auth-codes.mjs';
const fail=(message,status=422)=>{throw new DomainError(message,status)};
const hex=bytes=>Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
async function sign(secret,id,account,email,code){
 if(typeof secret!=='string'||secret.length<32)fail('Подтверждение почты ещё не настроено.',503);
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(JSON.stringify(['maxiflora-email-v1',id,account,email,code])))));
}
export async function newEmailConfirmation(u,secret,now=Date.now()){
 if(!u?.id||typeof u.email!=='string'||u.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email))fail('Сначала сохраните корректный email в профиле.');
 if(u.verified&&u.verificationMethod==='email')fail('Этот email уже подтверждён.');
 const code=newCode(),id=crypto.randomUUID(),email=u.email.trim().toLowerCase();
 return {code,record:{id,account:u.id,email,digest:await sign(secret,id,u.id,email,code),createdAt:now,expiresAt:now+600000,resendAt:now+60000,attempts:0,status:'pending'}};
}
export function reserveEmailConfirmation(s,u,record,now=Date.now()){
 if(!u||u.id!==record.account||u.email?.trim().toLowerCase()!==record.email)fail('Email изменился. Запросите код заново.',409);
 s.productionEmailChallenges??={};const old=s.productionEmailChallenges[u.id];
 if(old&&now<old.resendAt)fail('Повторный код доступен через минуту.',429);
 s.emailCodeRequests=(s.emailCodeRequests||[]).filter(x=>x.at>now-3600000);
 if(s.emailCodeRequests.filter(x=>x.account===u.id||x.email===record.email).length>=5)fail('Лимит писем исчерпан. Попробуйте через час.',429);
 if(s.emailCodeRequests.length>=1000)fail('Отправка временно занята. Попробуйте позже.',429);
 for(const [id,q] of Object.entries(s.productionEmailChallenges))if(q.expiresAt<=now)delete s.productionEmailChallenges[id];
 s.productionEmailChallenges[u.id]={...record};s.emailCodeRequests.push({account:u.id,email:record.email,at:now});
 return {id:record.id,expires:record.expiresAt,resendAt:record.resendAt};
}
export function finishEmailDelivery(s,account,id,accepted,now=Date.now()){
 const q=s.productionEmailChallenges?.[account];if(!q||q.id!==id||q.status!=='pending'||q.expiresAt<=now)return false;
 q.status=accepted?'sent':'delivery-failed';return true;
}
export async function confirmProductionEmail(s,u,code,secret,now=Date.now()){
 const q=s.productionEmailChallenges?.[u.id];
 if(!q||q.status!=='sent'||q.expiresAt<=now||q.email!==u.email?.trim().toLowerCase())return {ok:false,error:'Код недействителен или истёк. Запросите новое письмо.'};
 if(q.attempts>=5)return {ok:false,error:'Лимит попыток исчерпан. Запросите новое письмо.'};
 q.attempts++;
 if(typeof code!=='string'||!/^\d{6}$/.test(code)||await sign(secret,q.id,u.id,q.email,code)!==q.digest)return {ok:false,error:'Неверный код. Проверьте последнее письмо.'};
 q.status='consumed';q.consumedAt=now;u.verified=true;u.verificationMethod='email';u.verifiedAt=now;
 u.emailVerification={email:q.email,verifiedAt:now,challengeId:q.id,method:'smtp-code'};
 return {ok:true,verified:true,method:'email'};
}
