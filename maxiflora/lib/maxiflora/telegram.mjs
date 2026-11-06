import {createRemoteJWKSet,jwtVerify} from 'jose';
import {DomainError} from './engine.mjs';
const fail=(message,status=400)=>{throw new DomainError(message,status)};
export const TELEGRAM_ORIGIN='https://www.maxiflora.kz';
export const TELEGRAM_CALLBACK=TELEGRAM_ORIGIN+'/api/platform/telegram/callback';
export const TELEGRAM_COOKIE='__Host-maxiflora_telegram';
const issuer='https://oauth.telegram.org';
const keys=createRemoteJWKSet(new URL(issuer+'/.well-known/jwks.json'),{timeoutDuration:5000});
export const telegramConfigured=env=>/^\d{5,20}$/.test(env.TELEGRAM_CLIENT_ID||'')&&typeof env.TELEGRAM_CLIENT_SECRET==='string'&&env.TELEGRAM_CLIENT_SECRET.length>=16;
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');
const sha=async value=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
const base64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export async function newTelegramFlow({mode='login',account=null,session=null},now=Date.now()){
 if(!['login','link'].includes(mode)||mode==='link'&&(!account||!session))fail('Сначала войдите по паролю.',401);
 return {state:random(),browser:random(),verifier:random(),nonce:random(),mode,account,session,created:now,expires:now+600000};
}
export async function telegramAuthorization(flow,clientId){
 const u=new URL(issuer+'/auth');u.search=new URLSearchParams({client_id:clientId,redirect_uri:TELEGRAM_CALLBACK,response_type:'code',scope:'openid',state:flow.state,nonce:flow.nonce,code_challenge:base64url(await sha(flow.verifier)),code_challenge_method:'S256'}).toString();return u.href;
}
export function saveTelegramFlow(s,flow,now=Date.now()){
 s.telegramFlows=(s.telegramFlows||[]).filter(x=>x.expires>now);
 if(s.telegramFlows.length>=1000)fail('Повторите вход позже.',429);
 if(s.telegramFlows.filter(x=>x.created>now-60000).length>=50)fail('Слишком много запросов. Повторите через минуту.',429);
 s.telegramFlows.push(flow);
}
export function consumeTelegramFlow(s,state,browser,now=Date.now()){
 if(!/^[a-f0-9]{64}$/.test(state||'')||!/^[a-f0-9]{64}$/.test(browser||''))fail('Начните вход через Telegram заново.');
 const flow=s.telegramFlows?.find(x=>x.state===state&&x.browser===browser&&x.expires>now);
 if(!flow)fail('Запрос входа истёк или уже использован.');
 s.telegramFlows=s.telegramFlows.filter(x=>x.state!==state&&x.expires>now);return flow;
}
export async function verifyTelegramToken(token,clientId,nonce,keySet=keys,now=Date.now()){
 const {payload}=await jwtVerify(token,keySet,{issuer,audience:clientId,algorithms:['RS256'],requiredClaims:['sub','iat','exp','nonce'],maxTokenAge:'10m',currentDate:new Date(now),clockTolerance:5});
 if(payload.nonce!==nonce||typeof payload.sub!=='string'||!/^\d{1,30}$/.test(payload.sub))fail('Telegram не подтвердил вход.',401);
 return payload.sub;
}
export async function exchangeTelegramCode(code,flow,env,send=fetch){
 if(typeof code!=='string'||!code||code.length>4096)fail('Некорректный ответ Telegram.');
 const response=await send(issuer+'/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/x-www-form-urlencoded','Authorization':'Basic '+btoa(env.TELEGRAM_CLIENT_ID+':'+env.TELEGRAM_CLIENT_SECRET)},body:new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:TELEGRAM_CALLBACK,client_id:env.TELEGRAM_CLIENT_ID,code_verifier:flow.verifier})});
 if(!response.ok)fail('Не удалось подтвердить вход. Попробуйте ещё раз.',401);
 const body=await response.text();if(body.length>65536)fail('Некорректный ответ Telegram.',502);
 let data;try{data=JSON.parse(body)}catch{fail('Некорректный ответ Telegram.',502)}
 if(typeof data.id_token!=='string')fail('Telegram не подтвердил вход.',401);
 return verifyTelegramToken(data.id_token,env.TELEGRAM_CLIENT_ID,flow.nonce);
}
export function telegramAccount(s,subject,flow,now=Date.now()){
 s.telegramIdentities??={};const existing=s.telegramIdentities[subject];
 if(flow.mode==='link'){
  if(!s.profiles[flow.account])fail('Войдите по паролю заново.',401);
  if(existing&&existing.account!==flow.account)fail('Этот Telegram уже привязан к другому аккаунту.',409);
  if(Object.entries(s.telegramIdentities).some(([id,x])=>x.account===flow.account&&id!==subject))fail('К аккаунту уже привязан другой Telegram.',409);
  s.telegramIdentities[subject]={account:flow.account,linkedAt:existing?.linkedAt||now};return flow.account;
 }
 if(!existing||!s.profiles[existing.account]){const error=new DomainError('Сначала войдите по паролю или коду и привяжите Telegram в кабинете.',403);error.telegramReason='unlinked';throw error;}
 return existing.account;
}
export const telegramCookie=(value,age=600)=>`${TELEGRAM_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
