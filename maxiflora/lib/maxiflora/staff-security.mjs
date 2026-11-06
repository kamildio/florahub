import {DomainError} from './engine.mjs';
const fail=(message,status=403)=>{throw new DomainError(message,status)};
const encoder=new TextEncoder(),alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const unhex=value=>{if(typeof value!=='string'||value.length%2||!/^[a-f0-9]+$/i.test(value))fail('Защита кабинета временно недоступна.',503);return Uint8Array.from(value.match(/../g),v=>parseInt(v,16))};
const random=n=>crypto.getRandomValues(new Uint8Array(n));
const sha=async value=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))));
export function base32(bytes){let buffer=0,bits=0,out='';for(const b of bytes){buffer=(buffer<<8)|b;bits+=8;while(bits>=5){bits-=5;out+=alphabet[(buffer>>>bits)&31]}}if(bits)out+=alphabet[(buffer<<(5-bits))&31];return out;}
function decode32(value){if(typeof value!=='string'||!value.length||!/^[A-Z2-7]+$/.test(value))fail('Защита кабинета временно недоступна.',503);let buffer=0,bits=0,out=[];for(const c of value){buffer=(buffer<<5)|alphabet.indexOf(c);bits+=5;if(bits>=8){bits-=8;out.push((buffer>>>bits)&255)}}return new Uint8Array(out);}
// RFC 4226 dynamic truncation; the production verifier fixes SHA-1, six digits and 30 s.
export async function totp(secret,time=Date.now(),digits=6){
 if(!Number.isFinite(time)||time<0||![6,8].includes(digits))throw new Error('Invalid OTP parameters');
 const bytes=new Uint8Array(8);let counter=BigInt(Math.floor(time/30000));for(let i=7;i>=0;i--){bytes[i]=Number(counter&255n);counter>>=8n;}
 const key=await crypto.subtle.importKey('raw',decode32(secret),{name:'HMAC',hash:'SHA-1'},false,['sign']);
 const h=new Uint8Array(await crypto.subtle.sign('HMAC',key,bytes)),offset=h.at(-1)&15;
 const value=((h[offset]&127)*16777216)+(h[offset+1]<<16)+(h[offset+2]<<8)+h[offset+3];
 return String(value%10**digits).padStart(digits,'0');
}
async function encryptionKey(ctx){if(typeof ctx.encryptionKey!=='string'||!/^[a-f0-9]{64}$/i.test(ctx.encryptionKey))fail('Шифрование кабинета оператора ещё не настроено.',503);return crypto.subtle.importKey('raw',unhex(ctx.encryptionKey),'AES-GCM',false,['encrypt','decrypt']);}
const aad=id=>encoder.encode('maxiflora:staff-mfa:v1:'+id);
export async function sealSecret(secret,id,ctx){const iv=random(12),key=await encryptionKey(ctx);return {iv:hex(iv),ciphertext:hex(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(id)},key,encoder.encode(secret))))};}
export async function openSecret(value,id,ctx){try{const key=await encryptionKey(ctx);return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unhex(value.iv),additionalData:aad(id)},key,unhex(value.ciphertext)));}catch{fail('Защита кабинета временно недоступна. Требуется проверка оператором.',503);}}
function eligible(u,ctx){return !!u&&typeof ctx.ownerId==='string'&&ctx.ownerId.length>0&&u.id===ctx.ownerId&&u.verified===true&&typeof u.email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email)&&(ctx.testMode===true&&ctx.workspace?.startsWith('sandbox:')||ctx.workspace==='live'&&u.verificationMethod==='email');}
function identity(u,ctx,now){if(!eligible(u,ctx))fail('Кабинет оператора недоступен.');if(typeof ctx.sessionId!=='string'||!/^[a-f0-9]{64}$/.test(ctx.sessionId)||!Number.isFinite(ctx.sessionExpires)||ctx.sessionExpires<=now||!Number.isFinite(ctx.authenticatedAt)||ctx.authenticatedAt>now)fail('Войдите в аккаунт повторно.',401);}
function recentPassword(ctx,now){if(now-ctx.authenticatedAt>600000)fail('Для настройки защиты войдите заново с паролем.',401);}
function audit(s,u,event,result,now){s.staffSecurityAudit??=[];s.staffSecurityAudit.push({id:crypto.randomUUID(),actorId:u.id,event,result,time:now});}
function record(s,u){s.staffSecurity??={};return s.staffSecurity[u.id]??={failures:0,windowUntil:0,lastCounter:-1,sessions:{}};}
function attempt(s,u,q,now){if(now>=q.windowUntil){q.windowUntil=now+300000;q.failures=0;}if(q.failures>=5){audit(s,u,'mfa-check','throttled',now);return {ok:false,error:'Лимит попыток исчерпан. Повторите через пять минут.',retryAt:q.windowUntil};}return null;}
function refused(s,u,q,event,now){q.failures++;audit(s,u,event,'denied',now);return {ok:false,error:'Код недействителен, истёк или уже использован.'};}
function grant(q,ctx,method,now){q.sessions??={};for(const [id,x] of Object.entries(q.sessions))if(x.expiresAt<=now)delete q.sessions[id];q.sessions[ctx.sessionId]={verifiedAt:now,expiresAt:Math.min(ctx.sessionExpires,now+28800000),method};q.failures=0;q.windowUntil=0;}
async function matchingCounter(secret,code,last,now){if(typeof code!=='string'||!/^\d{6}$/.test(code))return null;const current=Math.floor(now/30000);let match=null;for(const delta of [0,-1,1]){const counter=current+delta;if(counter>=0&&counter>last&&await totp(secret,counter*30000)===code)match=counter;}return match;}
async function recoverySet(q,id){const codes=Array.from({length:10},()=>hex(random(16)).match(/.{8}/g).join('-'));q.recoveryHashes=await Promise.all(codes.map(c=>sha(id+':'+c.replaceAll('-',''))));return codes;}
export function staffSecurityView(s,u,ctx,now=Date.now()){
 if(!eligible(u,ctx))return {staffSecurity:null};
 const q=s.staffSecurity?.[u.id],session=q?.sessions?.[ctx.sessionId];
 const configured=typeof ctx.encryptionKey==='string'&&/^[a-f0-9]{64}$/i.test(ctx.encryptionKey);
 const confirmed=configured&&!!session&&session.verifiedAt<=now&&session.expiresAt>now&&ctx.sessionExpires>now;
 return {staffSecurity:{eligible:true,configured,enrolled:!!q?.secret,confirmed,fresh:confirmed&&now-session.verifiedAt<=300000,recoveryRemaining:q?.recoveryHashes?.length||0,...(confirmed?{verifiedAt:session.verifiedAt,expiresAt:session.expiresAt}:{}),audit:(s.staffSecurityAudit||[]).filter(x=>x.actorId===u.id).slice(-50).reverse()}};
}
export function requireStaffConfirmation(s,u,ctx,{critical=false,now=Date.now()}={}){
 identity(u,ctx,now);if(typeof ctx.encryptionKey!=='string'||!/^[a-f0-9]{64}$/i.test(ctx.encryptionKey))fail('Защита кабинета временно недоступна.',503);const q=s.staffSecurity?.[u.id],v=q?.sessions?.[ctx.sessionId];if(!q?.secret||!v||v.verifiedAt>now||v.expiresAt<=now)fail('Подтвердите вход кодом Microsoft Authenticator.',401);if(critical&&now-v.verifiedAt>300000)fail('Подтвердите критическое действие свежим кодом.',401);return {actorId:u.id,verifiedAt:v.verifiedAt,method:v.method};
}
// The caller supplies server-only context and commits even ok:false outcomes with CAS.
// Setup secrets and recovery plaintext are returned once and never stored in receipts/audit.
export async function staffSecurityAction(s,u,b,ctx,now=Date.now()){
 identity(u,ctx,now);await encryptionKey(ctx);
 if(!['begin','confirm','verify','recover','rotate-recovery','lock'].includes(b.action))fail('Действие защиты недоступно.',422);
 const q=record(s,u);
 if(b.action==='lock'){delete q.sessions[ctx.sessionId];audit(s,u,'mfa-session-lock','ok',now);return {ok:true};}
 if(b.action==='begin'){
  recentPassword(ctx,now);if(q.secret)fail('Защита уже подключена. Для входа используйте код.',409);
  if(q.pending&&now-q.pending.createdAt<60000)fail('Повторная настройка доступна через минуту.',429);
  const secret=base32(random(20)),setupId=crypto.randomUUID();q.pending={setupId,secret:await sealSecret(secret,u.id,ctx),createdAt:now,expiresAt:now+900000};
  audit(s,u,'mfa-enrollment-begin','ok',now);
  return {ok:true,setupId,secret,uri:'otpauth://totp/'+encodeURIComponent('MaXiFlora:'+u.email)+'?secret='+secret+'&issuer=MaXiFlora&algorithm=SHA1&digits=6&period=30',expiresAt:q.pending.expiresAt};
 }
 if(b.action==='confirm'){
  recentPassword(ctx,now);if(q.secret)fail('Защита уже подключена.',409);
  const blocked=attempt(s,u,q,now);if(blocked)return blocked;
  const p=q.pending;if(!p||p.expiresAt<=now||p.setupId!==b.setupId)return refused(s,u,q,'mfa-enrollment-confirm',now);
  const secret=await openSecret(p.secret,u.id,ctx),counter=await matchingCounter(secret,b.code,q.lastCounter,now);
  if(counter===null)return refused(s,u,q,'mfa-enrollment-confirm',now);
  q.secret=p.secret;q.lastCounter=counter;q.enrolledAt=now;delete q.pending;
  const recoveryCodes=await recoverySet(q,u.id);grant(q,ctx,'totp',now);audit(s,u,'mfa-enrollment-confirm','ok',now);
  return {ok:true,recoveryCodes};
 }
 if(!q.secret)fail('Сначала подключите Microsoft Authenticator.',409);
 if(b.action==='rotate-recovery'){
  // A newly consumed TOTP is required, not just an existing browser session.
  const blocked=attempt(s,u,q,now);if(blocked)return blocked;
  const secret=await openSecret(q.secret,u.id,ctx),counter=await matchingCounter(secret,b.code,q.lastCounter,now);
  if(counter===null)return refused(s,u,q,'mfa-recovery-rotate',now);
  q.lastCounter=counter;const recoveryCodes=await recoverySet(q,u.id);grant(q,ctx,'totp',now);audit(s,u,'mfa-recovery-rotate','ok',now);return {ok:true,recoveryCodes};
 }
 const blocked=attempt(s,u,q,now);if(blocked)return blocked;
 if(b.action==='recover'){
  const code=typeof b.code==='string'?b.code.toLowerCase().replaceAll('-',''):'';
  const hash=await sha(u.id+':'+code),index=/^[a-f0-9]{32}$/.test(code)?(q.recoveryHashes||[]).indexOf(hash):-1;
  if(index<0)return refused(s,u,q,'mfa-recovery',now);
  q.recoveryHashes.splice(index,1);grant(q,ctx,'recovery',now);audit(s,u,'mfa-recovery','ok',now);return {ok:true,recoveryRemaining:q.recoveryHashes.length};
 }
 const secret=await openSecret(q.secret,u.id,ctx),counter=await matchingCounter(secret,b.code,q.lastCounter,now);
 if(counter===null)return refused(s,u,q,'mfa-verify',now);
 q.lastCounter=counter;grant(q,ctx,'totp',now);audit(s,u,'mfa-verify','ok',now);return {ok:true};
}
