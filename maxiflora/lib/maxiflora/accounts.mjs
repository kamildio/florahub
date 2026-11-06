import {DomainError} from './engine.mjs';
const fail=(text,status=422)=>{throw new DomainError(text,status)};
export const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(n=>n.toString(16).padStart(2,'0')).join('');
export function accountMail(s,id,now=Date.now()){
 return (s.mailbox||[]).filter(m=>m.account===id&&m.expires>now).map(m=>({...m})).sort((a,b)=>b.time-a.time);
}
export async function issueEmailCode(s,u,{id,code},now=Date.now()){
 if(!u.email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email))fail('Сначала сохраните корректный email в профиле.');
 if(u.verified)fail('Этот email уже подтверждён.');
 s.emailChallenges??={};const previous=s.emailChallenges[u.id];
 if(previous&&now-previous.sentAt<60000)fail('Повторная отправка доступна через '+Math.ceil((60000-(now-previous.sentAt))/1000)+' сек.',429);
 const expires=now+3600000;
 s.emailChallenges[u.id]={id,email:u.email,digest:await digest(id+':'+code),expires,sentAt:now,attempts:0,used:false};
 s.mailbox??=[];s.mailbox=s.mailbox.filter(m=>m.account!==u.id&&m.expires>now);
 s.mailbox.unshift({id,account:u.id,to:u.email,subject:'Подтверждение email MaXiFlora · тест',code,time:now,expires,test:true});
 return {id,expires,resendAt:now+60000,test:true};
}
export async function verifyEmailCode(s,u,code,now=Date.now()){
 const q=s.emailChallenges?.[u.id];
 if(!q||q.used||now>=q.expires||q.email!==u.email)return {ok:false,error:'Код истёк, уже использован или относится к прежнему email. Запросите новый.'};
 if(q.attempts>=10)return {ok:false,error:'Лимит попыток исчерпан. Запросите новый код.'};
 q.attempts++;
 if(typeof code!=='string'||!/^\d{6}$/.test(code)||(await digest(q.id+':'+code))!==q.digest)return {ok:false,error:'Неверный код. Проверьте последнее тестовое письмо.'};
 q.used=true;u.verified=true;u.verificationMethod='sandbox';u.verifiedAt=now;
 s.mailbox=(s.mailbox||[]).filter(m=>m.account!==u.id);
 return {ok:true,verified:true,method:'sandbox'};
}
