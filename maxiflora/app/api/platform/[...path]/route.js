import {adminOrdersView} from '../../../../lib/maxiflora/admin-orders.mjs';
import {adminQueueView,syncAdminQueueNotifications} from '../../../../lib/maxiflora/admin-queues.mjs';
import {whatsappReadiness} from '../../../../lib/maxiflora/whatsapp-readiness.mjs';
import {operationsView,operationsAction,supplierBannerView} from '../../../../lib/maxiflora/operations.mjs';
import {hasStaffPermission} from '../../../../lib/maxiflora/staff-permissions.mjs';
import {paymentView,paymentAction,billingAdminView,billingAdminAction,claimPaymentNotice,finishPaymentNotice,sendPaymentNotice,billingConfigured} from '../../../../lib/maxiflora/manual-payments.mjs';
import {platformSettingsAction,platformSettingsView,platformSettingsDenial,ensurePlatformSettings,publicPlatformSettings} from '../../../../lib/maxiflora/platform-settings.mjs';
import {catalogAdminAction,catalogAdminView,catalogAdminDenial} from '../../../../lib/maxiflora/catalog-admin.mjs';
import {ensureDirectory,publicCategories} from '../../../../lib/maxiflora/catalog-directory.mjs';
import {phoneChannels,phoneChannel,phoneCodeSecret,requirePhoneConsent,channelConsentVersion,phoneMethod,sendPhoneCode} from '../../../../lib/maxiflora/phone-channels.mjs';
import {whatsappFailureMessage} from '../../../../lib/maxiflora/whatsapp-cloud.mjs';
import {searchCatalog} from '../../../../lib/maxiflora/catalog-search.mjs';
import {supplierAdminView,supplierAdminAction} from '../../../../lib/maxiflora/supplier-admin.mjs';
import {submitSupplier,submitBuyer} from '../../../../lib/maxiflora/company-profile.mjs';
import {recordGatewayDelivery,gatewayFailureMessage} from '../../../../lib/maxiflora/telegram-feedback.mjs';
import {newEmailConfirmation,reserveEmailConfirmation,finishEmailDelivery,confirmProductionEmail} from '../../../../lib/maxiflora/email-confirmation.mjs';
import {privacyAction,claimDeletionNotice,finishDeletionNotice} from '../../../../lib/maxiflora/privacy.mjs';
import {CONSENT_VERSION,registrationDetails,createVerifiedAccount,restoreAccountProfile} from '../../../../lib/maxiflora/registration.mjs';
import {normalizePhone,normalizeEmail,makeChallenge,storeChallenge,markDelivered,markDeliveryFailed,consumeCode} from '../../../../lib/maxiflora/auth-codes.mjs';
import {telegramConfigured,newTelegramFlow,telegramAuthorization,saveTelegramFlow,consumeTelegramFlow,exchangeTelegramCode,telegramAccount,telegramCookie,TELEGRAM_COOKIE,TELEGRAM_ORIGIN} from '../../../../lib/maxiflora/telegram.mjs';
import { env } from '#platform-runtime';
import { apply, snapshot, seed, demoProfiles, DomainError } from '../../../../lib/maxiflora/engine.mjs';
import {loadState,mutateState,runTimers} from '../../../../lib/maxiflora/store.mjs';
import {accountMail,issueEmailCode,verifyEmailCode} from '../../../../lib/maxiflora/accounts.mjs';
import {assemblyView,createAssembly,setAssemblyProgress,batchReady} from '../../../../lib/maxiflora/fulfillment.mjs';
import {ensureInventory,inventoryReport,supplierCalendar,receiptTemplate,ownImports,previewReceipt,applyReceipt} from '../../../../lib/maxiflora/inventory.mjs';
import {businessAction,businessView,reports} from '../../../../lib/maxiflora/business.mjs';
import {inventoryVersion} from '../../../../lib/maxiflora/inventory.mjs';
import {offerTemplate,previewOffers,applyOffers} from '../../../../lib/maxiflora/offers-import.mjs';
import {ensureBoard,boardView,boardAction} from '../../../../lib/maxiflora/board.mjs';
import {attachPhoto,ownedAd,photoInfo,inspectPhoto,boundedPhotoBody} from '../../../../lib/maxiflora/media.mjs';
import {TEST_MODERATOR,testModeratorProfile,requireTestModerator,moderationView,moderationAction} from '../../../../lib/maxiflora/moderation.mjs';
import {conversationView,conversationAction} from '../../../../lib/maxiflora/conversations.mjs';
import {enrollNewAccount,subscriptionView,subscriptionAction,ensureTariffHistory,tariffHistoryPage} from '../../../../lib/maxiflora/subscriptions.mjs';
import {staffSecurityView,staffSecurityAction} from '../../../../lib/maxiflora/staff-security.mjs';
import {syncCabinetNews,ensureHomeContent,publicHomeContent,requireHomeEditor,homeContentView,homeContentAction,homeContentDenial} from '../../../../lib/maxiflora/home-content.mjs';
export const dynamic='force-dynamic';
const COOKIE='maxiflora_session';
const json=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
const error=(message,status=422)=>{throw new DomainError(message,status)};
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');
const local=r=>['localhost','127.0.0.1','[::1]'].includes(new URL(r.url).hostname);
const testing=r=>local(r)||env.TEST_MODE==='true';
function workspace(r){if(!testing(r))return 'live';const id=(local(r)&&r.headers.get('x-maxiflora-test-workspace'))||r.headers.get('oai-authenticated-user-id');if(!id&&!local(r))error('Войдите в закрытый тестовый сайт.',401);return 'sandbox:'+(id||'local');}
function db(){if(!env.DB)error('База данных ещё не подключена.',503);return env.DB;}
const load=id=>loadState(db(),id);
const mutate=(id,fn)=>mutateState(db(),id,async(s,time)=>{const result=await fn(s,time);syncAdminQueueNotifications(s,env.STAFF_OWNER_ACCOUNT_ID,time);return result});
async function session(r){const token=(r.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(!token||!/^[a-f0-9]{64}$/.test(token))return null;return db().prepare('SELECT token,account,workspace,expires FROM sessions WHERE token=? AND expires>?').bind(await hash(token),Date.now()).first();}
const cookie=(r,token,age=604800)=>`${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(r.url).protocol==='https:'?'; Secure':''}`;
async function startSession(r,account,ws){const token=random();await db().prepare('INSERT INTO sessions (token,account,workspace,expires) VALUES (?,?,?,?)').bind(await hash(token),account,ws,Date.now()+604800000).run();return cookie(r,token);}
const phone=normalizePhone;
const emailAuthEnabled=()=>env.EMAIL_AUTH_ENABLED==='true';
const emailAuthReady=()=>(emailAuthEnabled()||env.EMAIL_AUTH_ENABLED==='pilot')&&env.EMAIL_CONFIGURED===true&&typeof env.SEND_VERIFICATION_EMAIL==='function'&&typeof env.EMAIL_CODE_SECRET==='string'&&env.EMAIL_CODE_SECRET.length>=32;
const emailMatches=(profile,email)=>profile?.verified===true&&profile.verificationMethod==='email'&&profile.email?.trim().toLowerCase()===email&&profile.emailVerification?.email===email;
async function verifiedEmailAccount(email){
 const account=await db().prepare('SELECT * FROM accounts WHERE email=?').bind(email).first();
 return account&&emailMatches(JSON.parse(account.profile),email)?account:null;
}
async function passwordHash(password,salt=random()){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256);return salt+':'+Array.from(new Uint8Array(bits)).map(x=>x.toString(16).padStart(2,'0')).join('');}
async function deliverPaymentNotice(ws){if(ws!=='live'||!billingConfigured(env))return;const {result:job}=await mutate(ws,(s,time)=>claimPaymentNotice(s,time));if(!job)return;const ok=await sendPaymentNotice(env,job);await mutate(ws,(s,time)=>finishPaymentNotice(s,job,ok,time));}
async function deliverDeletionNotice(ws){
 if(ws!=='live'||env.EMAIL_CONFIGURED!==true||typeof env.SEND_DELETION_NOTICE!=='function')return;
 const {result:job}=await mutate(ws,(s,time)=>claimDeletionNotice(s,time));if(!job)return;
 let accepted=false;try{await env.SEND_DELETION_NOTICE(job);accepted=true}catch{}
 await mutate(ws,(s,time)=>finishDeletionNotice(s,job,accepted,time));
}
async function handle(r){try{
 const path=new URL(r.url).pathname.split('/').at(-1);const method=r.method;
 if(method==='POST'){
  const origin=r.headers.get('origin');if(path!=='maintenance'&&(!origin||origin!==new URL(r.url).origin))error('Запрос должен быть отправлен с сайта MaXiFlora.',403);
  if(path!=='media-upload'&&!r.headers.get('content-type')?.includes('application/json'))error('Неверный формат запроса.',415);
 }
 let b={};if(method==='POST'&&path!=='media-upload'){const raw=await r.text();if(raw.length>65536)error('Запрос слишком большой.',413);try{b=JSON.parse(raw)}catch{error('Неверный формат запроса.',400)}if(!b||Array.isArray(b)||typeof b!=='object')error('Неверный формат запроса.',400);}
 if(path==='maintenance'&&method==='POST'){
  const supplied=r.headers.get('x-maxiflora-maintenance');
  if(!env.MAINTENANCE_SECRET||!supplied||(await hash(supplied))!==(await hash(env.MAINTENANCE_SECRET)))error('Обработчик недоступен.',403);
  if(typeof b.after!=='undefined'&&(typeof b.after!=='string'||b.after.length>200))error('Неверный указатель обработки.',400);
  const result=await runTimers(db(),{after:b.after||'',limit:100});await deliverPaymentNotice('live');await deliverDeletionNotice('live');return json(result);
 }
 if(new URL(r.url).pathname==='/api/platform/telegram/callback'&&method==='GET'){
  const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','Set-Cookie':telegramCookie('',0)};
  try{
   if(emailAuthEnabled()||!telegramConfigured(env)||testing(r)||new URL(r.url).origin!==TELEGRAM_ORIGIN)error('Вход через Telegram ещё не подключён.',503);
   const params=new URL(r.url).searchParams;
   if(['state','code','error'].some(key=>params.getAll(key).length>1))error('Некорректный ответ Telegram.',400);
   const browser=(r.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(TELEGRAM_COOKIE+'='))?.slice(TELEGRAM_COOKIE.length+1);
   const {result:flow}=await mutate('live',s=>consumeTelegramFlow(s,params.get('state'),browser));
   if(params.has('error')){const cancelled=new DomainError('Вход отменён.',401);cancelled.telegramReason='cancelled';throw cancelled;}
   const subject=await exchangeTelegramCode(params.get('code'),flow,env);
   if(flow.mode==='link'){
    const active=await db().prepare('SELECT token,account,workspace,expires FROM sessions WHERE token=? AND expires>?').bind(flow.session,Date.now()).first();
    if(!active||active.account!==flow.account||active.workspace!=='live'||Date.now()-(active.expires-604800000)>600000)error('Для привязки войдите по паролю заново.',401);
   }
   const {result:account}=await mutate('live',s=>telegramAccount(s,subject,flow));
   const result=new Response(null,{status:303,headers:{...headers,Location:TELEGRAM_ORIGIN+'/?telegram=success#account'}});
   result.headers.append('Set-Cookie',await startSession(r,account,'live'));return result;
  }catch(e){
   const reason=['unlinked','cancelled'].includes(e.telegramReason)?e.telegramReason:'retry';
   return new Response(null,{status:303,headers:{...headers,Location:TELEGRAM_ORIGIN+'/?telegram='+reason+'#account'}});
  }
 }
 const foundSession=await session(r),auth=foundSession&&(!foundSession.workspace.startsWith('sandbox:')||testing(r))?foundSession:null;
 const guestPreview=testing(r)&&!auth&&!local(r)&&!r.headers.get('oai-authenticated-user-id');
 if(path==='state'&&method==='GET'&&guestPreview){const preview=seed();ensureBoard(preview,Date.now(),true);return json({...snapshot(preview,null),...publicPlatformSettings(preview),platformSettingsAdmin:null,...businessView(preview,null),...boardView(preview,null),...subscriptionView(null),assemblySheets:[],mailbox:[],testMode:true,authenticated:false,requiresSignIn:true,homeBanners:publicHomeContent(preview),homeContentAdmin:null,catalogCategories:publicCategories(preview),catalogAdmin:null});}
 const ws=auth?.workspace||workspace(r);
 const staffContext={ownerId:env.STAFF_OWNER_ACCOUNT_ID,encryptionKey:env.STAFF_MFA_ENCRYPTION_KEY,workspace:ws,testMode:testing(r),sessionId:auth?.token,authenticatedAt:auth?auth.expires-604800000:undefined,sessionExpires:auth?.expires};
 if(path==='action'&&method==='POST'&&b.action==='email-send'&&!testing(r)){
  if(!auth)error('Войдите в аккаунт.',401);
  if(!env.EMAIL_CONFIGURED||typeof env.SEND_VERIFICATION_EMAIL!=='function')error('Почтовый сервис ещё не подключён.',503);
  const initial=JSON.parse((await load(ws)).state),u=initial.profiles[auth.account];
  const {record,code}=await newEmailConfirmation(u,env.EMAIL_CODE_SECRET);
  const {result}=await mutate(ws,(s,time)=>reserveEmailConfirmation(s,s.profiles[auth.account],record,time));
  // Delivery is deliberately outside the retried state transaction.
  try{await env.SEND_VERIFICATION_EMAIL({to:record.email,code})}catch{
   await mutate(ws,(s,time)=>finishEmailDelivery(s,auth.account,record.id,false,time));
   return json({error:'Не удалось отправить письмо. Попробуйте позже или обратитесь в поддержку.'},503);
  }
  await mutate(ws,(s,time)=>finishEmailDelivery(s,auth.account,record.id,true,time));
  return json({...result,accepted:true});
 }
 if(path==='auth-code-send'&&method==='POST'){
  const emailCode=b.channel==='email';
  const channel=emailCode?'email':phoneChannel(b.channel);
  if(emailCode?(!emailAuthReady()||(b.purpose==='register'&&!emailAuthEnabled())):emailAuthEnabled())error('Выбранный способ отправки кодов пока не подключён.',503);
  if(testing(r)||(!emailCode&&!phoneChannels(env).channels[channel]))error('Выбранный способ отправки кодов пока не подключён.',503);
  if(!['register','login','reset-password'].includes(b.purpose))error('Выберите способ подтверждения.',400);
  if(!emailCode)requirePhoneConsent(b);
  if(b.purpose==='register'&&(env.REGISTRATION_ENABLED!=='true'||env.LEGAL_APPROVED_VERSION!==CONSENT_VERSION))error('Регистрация откроется после утверждения документов.',503);
  if(!/^[a-f0-9-]{36}$/.test(b.operationId||''))error('Начните отправку заново.',400);
  if(b.purpose==='register'){registrationDetails(b);if(db().accountEmailReady&&!(await db().accountEmailReady()))error('Регистрация временно недоступна. Попробуйте позже.',503);}
  const existingBrowser=(r.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('__Host-maxiflora_code='))?.slice('__Host-maxiflora_code='.length);
  const browser=/^[a-f0-9]{64}$/.test(existingBrowser||'')?existingBrowser:random();
  const secret=emailCode?env.EMAIL_CODE_SECRET:phoneCodeSecret(env,channel);
  const {record,code}=await makeChallenge({phone:b.phone,email:b.email,purpose:b.purpose,browser,secret,channel});
  if(emailCode){
   const account=b.purpose==='register'?null:await verifiedEmailAccount(record.phone);
   record.account=account?.id||null;
   const {result}=await mutate('live',(s,time)=>storeChallenge(s,record,time));
   if(b.purpose==='register'||account){
    try{await env.SEND_VERIFICATION_EMAIL({to:record.phone,code,purpose:b.purpose});}
    catch{await mutate('live',s=>markDeliveryFailed(s,record.id));if(b.purpose==='register')error('Не удалось отправить письмо. Попробуйте позже.',503);}
    await mutate('live',(s,time)=>markDelivered(s,record.id,time));
   }
   return json({...result,channel},200,{'Set-Cookie':`__Host-maxiflora_code=${browser}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=600`});
  }
  record[channel+'Consent']={presentation:b.purpose==='register'?registrationDetails(b).consentPresentation:'channel-checkbox',version:channelConsentVersion(channel),time:record.createdAt,accepted:true};
  const {result}=await mutate('live',(s,time)=>{
   s.authSendReceipts??={};for(const [key,value] of Object.entries(s.authSendReceipts))if(value.at<time-3600000)delete s.authSendReceipts[key];
   const old=s.authSendReceipts[b.operationId];
   if(old){if((old.channel||'telegram')!==channel||old.phone!==record.phone||old.purpose!==b.purpose||old.browserHash!==record.browserHash)error('Идентификатор запроса уже использован.',409);return {...old.result,replay:true,deliveryState:old.deliveryState||'unknown',failureReason:old.failureReason};}
   // Hard cap for the initial launch. No retries of a paid send in the server.
   s.gatewayBudget??={day:'',count:0};const day=new Date(time+5*3600000).toISOString().slice(0,10);
   if(s.gatewayBudget.day!==day)s.gatewayBudget={day,count:0};
   if(s.gatewayBudget.count>=20)error('Дневной лимит отправки кодов исчерпан. Используйте вход по паролю.',429);
   const result={...storeChallenge(s,record,time),channel};s.gatewayBudget.count++;
   s.authSendReceipts[b.operationId]={at:time,channel,phone:record.phone,purpose:b.purpose,browserHash:record.browserHash,result,deliveryState:'pending'};return result;
  });
  if(result.replay&&result.deliveryState!=='sent')error(result.deliveryState==='failed'?(channel==='whatsapp'?whatsappFailureMessage:gatewayFailureMessage(result.failureReason)):'Отправка ещё не подтверждена. Подождите минуту и запросите новый код.',503);
  if(!result.replay){try{await sendPhoneCode({phone:record.phone,code,id:record.id},env,channel);await mutate('live',(s,time)=>{markDelivered(s,record.id,time);recordGatewayDelivery(s,record.id,{ok:true},time)});}catch(e){await mutate('live',(s,time)=>{markDeliveryFailed(s,record.id);recordGatewayDelivery(s,record.id,{ok:false,reason:e.gatewayReason},time)});throw e;}}
  return json(result,200,{'Set-Cookie':`__Host-maxiflora_code=${browser}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=600`});
 }
 if(path==='auth-code-verify'&&method==='POST'){
  const emailCode=b.channel==='email';
  const channel=emailCode?'email':phoneChannel(b.channel);
  if(emailCode?(!emailAuthReady()||(b.purpose==='register'&&!emailAuthEnabled())):emailAuthEnabled())error('Выбранный способ отправки кодов пока не подключён.',503);
  if(testing(r)||(!emailCode&&!phoneChannels(env).channels[channel]))error('Вход по коду пока не подключён.',503);
  if(!['register','login','reset-password'].includes(b.purpose))error('Неверный способ подтверждения.',400);
  const normalized=emailCode?normalizeEmail(b.email):phone(b.phone);
  if(b.purpose==='register'&&(env.REGISTRATION_ENABLED!=='true'||env.LEGAL_APPROVED_VERSION!==CONSENT_VERSION))error('Регистрация пока закрыта.',503);
  if(b.purpose!=='login'&&(typeof b.password!=='string'||b.password.length<8||b.password.length>128))error('Пароль — от 8 до 128 символов.');
  if(b.purpose==='register'){registrationDetails(b);if(db().accountEmailReady&&!(await db().accountEmailReady()))error('Регистрация временно недоступна. Попробуйте позже.',503);}
  const browser=(r.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('__Host-maxiflora_code='))?.slice('__Host-maxiflora_code='.length);
  const {result:proof}=await mutate('live',(s,time)=>consumeCode(s,{id:b.id,phone:normalized,purpose:b.purpose,browser,code:b.code,channel,secret:emailCode?env.EMAIL_CODE_SECRET:phoneCodeSecret(env,channel)},time));
  if(!proof.ok)return json(proof,422);
  let account=emailCode?(b.purpose==='register'?null:await verifiedEmailAccount(normalized)):await db().prepare('SELECT * FROM accounts WHERE phone=?').bind(normalized).first();
  if(b.purpose==='register'){
   account=await createVerifiedAccount(db(),b,proof,passwordHash);
  }else if(!account)error('Аккаунт не найден. Сначала зарегистрируйтесь.',404);
  if(emailCode&&b.purpose!=='register'&&proof.account!==account.id)error('Код недействителен или истёк. Запросите новый.',422);
  if(emailCode)await mutate('live',s=>{
   const u=restoreAccountProfile(s,account);
   if(!emailMatches(u,normalized))error('Код недействителен или истёк. Запросите новый.',422);
  });
  if(b.purpose==='reset-password'){
   const replacement=await passwordHash(b.password);
   await db().prepare('DELETE FROM sessions WHERE account=?').bind(account.id).run();
   await db().prepare('UPDATE accounts SET password=? WHERE id=?').bind(replacement,account.id).run();
  }
  if(!emailCode)await mutate('live',s=>{restoreAccountProfile(s,account);Object.assign(s.profiles[account.id],{phoneVerified:true,phoneVerificationMethod:phoneMethod(proof.channel),phoneVerifiedAt:proof.verifiedAt})});
  return json({ok:true},200,{'Set-Cookie':await startSession(r,account.id,'live')});
 }
 if(path==='telegram-start'&&method==='POST'){
  if(testing(r)||new URL(r.url).origin!==TELEGRAM_ORIGIN||emailAuthEnabled()||!telegramConfigured(env))error('Вход через Telegram ещё не подключён.',503);
  const mode=b.mode||'login';
  if(mode==='link'&&(!auth||Date.now()-(auth.expires-604800000)>600000))error('Для привязки Telegram войдите по паролю заново.',401);
  const flow=await newTelegramFlow({mode,account:mode==='link'?auth.account:null,session:mode==='link'?auth.token:null});
  await mutate('live',s=>saveTelegramFlow(s,flow));
  return json({url:await telegramAuthorization(flow,env.TELEGRAM_CLIENT_ID)},200,{'Set-Cookie':telegramCookie(flow.browser)});
 }
 if(path==='admin-orders'&&method==='GET'){if(!auth)error('Войдите в аккаунт.',401);const s=JSON.parse((await load(ws)).state),params=new URL(r.url).searchParams;return json(adminOrdersView(s,s.profiles[auth.account],staffContext,{query:params.get('query')||'',status:params.get('status')||'all',...(params.has('before')?{before:Number(params.get('before'))}:{}),...(params.has('id')?{id:Number(params.get('id'))}:{})}));}
 if(path==='supplier-admin'&&['GET','POST'].includes(method)){
  if(!auth)error('Войдите в аккаунт.',401);
  if(method==='GET'){const s=JSON.parse((await load(ws)).state);return json(supplierAdminView(s,s.profiles[auth.account],staffContext));}
  const {result}=await mutate(ws,(s,time)=>supplierAdminAction(s,s.profiles[auth.account],b,staffContext,time));return json(result);
 }
 if(path==='staff-security'&&['GET','POST'].includes(method)){
  if(!auth)error('Войдите в аккаунт.',401);
  if(method==='GET'){const s=JSON.parse((await load(ws)).state);return json(staffSecurityView(s,s.profiles[auth.account],staffContext));}
  const {result}=await mutate(ws,(s,time)=>staffSecurityAction(s,s.profiles[auth.account],b,staffContext,time));return json(result);
 }
 if(path==='platform-settings'&&method==='POST'){
  if(!auth)error('Войдите в аккаунт.',401);
  const {result}=await mutate(ws,async(s,time)=>{try{return await platformSettingsAction(s,s.profiles[auth.account],b,staffContext,time);}catch(e){if(!(e instanceof DomainError))throw e;platformSettingsDenial(s,s.profiles[auth.account],b.action,e.status,time);return {error:e.message,status:e.status};}});
  return json(result,result.status||200);
 }
 if(path==='catalog-admin'&&method==='POST'){
  if(!auth)error('Войдите в аккаунт.',401);
  const {result}=await mutate(ws,async(s,time)=>{try{return await catalogAdminAction(s,s.profiles[auth.account],b,staffContext,time);}catch(e){if(!(e instanceof DomainError))throw e;catalogAdminDenial(s,s.profiles[auth.account],b.action,e.status,time);return {error:e.message,status:e.status};}});
  return json(result,result.status||200);
 }
 if(path==='home-content'&&method==='POST'){
  if(!auth)error('Войдите в аккаунт.',401);
  const {result}=await mutate(ws,async(s,time)=>{try{return await homeContentAction(s,s.profiles[auth.account],b,staffContext,time);}catch(e){if(!(e instanceof DomainError))throw e;homeContentDenial(s,s.profiles[auth.account],b.action,e.status,time);return {error:e.message,status:e.status};}});
  return json(result,result.status||200);
 }
 if(path==='operations'&&method==='POST'){
  if(!auth)error('Войдите в аккаунт.',401);
  const {result}=await mutate(ws,(s,time)=>operationsAction(s,s.profiles[auth.account],b,staffContext,time));return json(result);
 }
 if(path==='monitoring'&&method==='GET'){
  if(!auth)error('Войдите в аккаунт.',401);const s=JSON.parse((await load(ws)).state);await requireHomeEditor(s,s.profiles[auth.account],staffContext,false,Date.now(),'monitoring');return json({monitoring:typeof env.REQUEST_METRICS==='function'?env.REQUEST_METRICS():null,whatsappReadiness:whatsappReadiness(env)});
 }
 if(path==='payments'&&method==='GET'){if(!auth)error('Войдите в аккаунт.',401);const {s}=await mutate(ws,()=>null);return json(paymentView(s,s.profiles[auth.account],env));}
 if(['payments','billing-admin'].includes(path)&&method==='POST'){
  if(!auth)error('Войдите в аккаунт.',401);
  const {result}=await mutate(ws,(s,time)=>path==='payments'?paymentAction(s,s.profiles[auth.account],b,env,time):billingAdminAction(s,s.profiles[auth.account],b,staffContext,time));
  if(path==='payments'&&b.action==='paid')await deliverPaymentNotice(ws);return json(result);
 }
 if(path==='media-upload'&&method==='POST'){
  if(!auth)error('Войдите в аккаунт.',401);
  if(!testing(r))error('Загрузка откроется после подключения проверки файлов и подтверждения размещения данных.',503);
  if(!env.BUCKET)error('Хранилище фотографий ещё не подключено.',503);
  const adId=r.headers.get('x-maxiflora-ad'),version=Number(r.headers.get('x-maxiflora-version')),operationId=r.headers.get('x-maxiflora-upload-id');
  if(!adId||!Number.isSafeInteger(version)||version<1||!/^[-a-zA-Z0-9]{16,80}$/.test(operationId||''))error('Не указаны объявление, версия или идентификатор загрузки.',400);
  const before=JSON.parse((await load(ws)).state);ownedAd(before,before.profiles[auth.account],adId);
  const bytes=await boundedPhotoBody(r);let name;try{name=decodeURIComponent(r.headers.get('x-maxiflora-filename')||'')}catch{error('Некорректное имя файла.',400)}
  const info=inspectPhoto(bytes,r.headers.get('content-type'),name),checksum=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const fingerprint=await hash(JSON.stringify({adId,version,...info,checksum})),receiptKey=auth.account+':upload:'+operationId;
  const replay=state=>{const old=state.receipts[receiptKey];if(!old)return null;if(old.fingerprint!==fingerprint)error('Идентификатор загрузки уже использован для другого файла.',409);return old.result};
  const prior=replay(before);if(prior){const saved=(before.boardFiles||[]).find(f=>f.id===prior.photo.id);if(!saved||!await env.BUCKET.head(saved.key))error('Сохранённая фотография временно недоступна. Обновите данные.',503);return json(prior);}
  const file={...info,id:crypto.randomUUID(),key:'quarantine/'+crypto.randomUUID(),checksum};let keep=false,completed=false;
  try{
   await env.BUCKET.put(file.key,bytes,{httpMetadata:{contentType:'application/octet-stream'},customMetadata:{status:'quarantined',checksum}});
   const {result}=await mutate(ws,(state,time)=>{const old=replay(state);if(old)return old;const result=attachPhoto(state,state.profiles[auth.account],{adId,version,photo:file},time);state.receipts[receiptKey]={fingerprint,result,time};return result});
   keep=result.photo.id===file.id;completed=true;return json(result);
  }finally{if(!keep){let removable=completed;if(!completed){try{const latest=JSON.parse((await load(ws)).state);removable=!(latest.boardFiles||[]).some(f=>f.id===file.id)}catch{removable=false}}if(removable)await env.BUCKET.delete(file.key).catch(()=>{})}}
 }
 if(path==='media'&&method==='GET'){
  if(!auth)error('Фотография недоступна.',404);
  const state=JSON.parse((await load(ws)).state),id=new URL(r.url).searchParams.get('id'),file=(state.boardFiles||[]).find(f=>f.id===id&&f.ownerId===auth.account);
  if(!file)error('Фотография недоступна.',404);const ad=ownedAd(state,state.profiles[auth.account],file.adId);
  if(!ad.photoIds?.includes(file.id)||file.status==='detached')error('Фотография недоступна.',404);
  // No scanner/derivative pipeline is connected: quarantined bytes are never downloadable.
  return json({error:'Фотография ожидает проверки безопасности. Просмотр и скачивание пока недоступны.',photo:photoInfo(file)},423);
 }

 if(path==='catalog'&&method==='GET'){
  const {s}=await mutate(ws,()=>null);
  return json(searchCatalog(snapshot(s,null).products,new URL(r.url).searchParams));
 }
 if(path==='state'&&method==='GET'){
  const {s,revision}=await mutate(ws,(s,time)=>{ensureInventory(s,time);ensureBoard(s,time,testing(r));ensureHomeContent(s);syncCabinetNews(s,time);ensureDirectory(s);ensurePlatformSettings(s);conversationView(s,null);if(auth)ensureTariffHistory(s.profiles[auth.account])}),u=auth?s.profiles[auth.account]:null;
  const mode=new URL(r.url).searchParams.get('mode');
  const view=snapshot(s,u,mode);if(mode!=='supplier'&&new URL(r.url).searchParams.get('catalog')==='remote')view.products=[];
  return json({...view,...paymentView(s,u,env),...await billingAdminView(s,u,staffContext,env),...await homeContentView(s,u,staffContext),...await catalogAdminView(s,u,staffContext),...await platformSettingsView(s,u,staffContext),...staffSecurityView(s,u,staffContext),...adminQueueView(s,u,staffContext),...await operationsView(s,u,staffContext),...supplierBannerView(s,u),...subscriptionView(u,Date.now(),s),...businessView(s,u),...boardView(s,u),...conversationView(s,u),...moderationView(s,u,{testMode:testing(r),workspace:ws,productionAuthorized:hasStaffPermission(s,u,staffContext,'moderation')&&staffSecurityView(s,u,staffContext).staffSecurity?.confirmed===true}),offerImports:mode==='supplier'&&u?.supplier?(s.offerImports||[]).filter(x=>x.supplierId===u.id):[],stockVersions:mode==='supplier'&&u?.supplier?Object.fromEntries(await Promise.all(s.products.filter(p=>p.supplierId===u.id).map(async p=>[p.id,await inventoryVersion(p)]))):{},assemblySheets:mode==='supplier'&&u?.supplier?(s.assemblySheets||[]).filter(x=>x.supplierId===u.id).map(x=>assemblyView(s,u,x.id)):[],inventoryImports:mode==='supplier'?ownImports(s,u):[],calendar:mode==='supplier'?supplierCalendar(s,u):[],mailbox:u&&testing(r)?accountMail(s,u.id):[],revision,testMode:testing(r),authenticated:!!u,emailVerification:{configured:!testing(r)&&env.EMAIL_CONFIGURED===true,pending:!!u&&!testing(r)&&s.productionEmailChallenges?.[u.id]?.status==='sent'&&s.productionEmailChallenges[u.id].expiresAt>Date.now()&&s.productionEmailChallenges[u.id].email===u.email?.trim().toLowerCase()},phoneAuth:{...phoneChannels(testing(r)||emailAuthEnabled()?{}:env),email:!testing(r)&&emailAuthReady(),emailMode:!testing(r)&&emailAuthEnabled(),registration:!testing(r)&&(emailAuthEnabled()?emailAuthReady():phoneChannels(env).configured)&&env.REGISTRATION_ENABLED==='true'&&env.LEGAL_APPROVED_VERSION===CONSENT_VERSION&&(!db().accountEmailReady||await db().accountEmailReady())},telegram:{configured:!testing(r)&&!emailAuthEnabled()&&telegramConfigured(env),linked:!!u&&Object.values(s.telegramIdentities||{}).some(x=>x.account===u.id)}});
 }
 if(path==='tariff-history'&&method==='GET'){
  if(!auth)error('Войдите для просмотра истории тарифов.',401);
  const before=new URL(r.url).searchParams.get('before');
  if(before!==null&&!/^[1-9]\d*$/.test(before))error('Неверная страница истории.',400);
  const {result}=await mutate(ws,s=>{const u=s.profiles[auth.account];if(!u)error('Сеанс недействителен.',401);ensureTariffHistory(u);return tariffHistoryPage(u,before===null?undefined:Number(before))});return json(result);
 }
 if(['inventory-report','inventory-template'].includes(path)&&method==='GET'){
  if(!auth)error('Войдите в аккаунт.',401);
  const {result}=await mutate(ws,async(s,time)=>{const u=s.profiles[auth.account];if(!u)error('Сеанс недействителен.',401);return path==='inventory-report'?inventoryReport(s,u,new URL(r.url).searchParams.get('month'),time):await receiptTemplate(s,u,time,Number(new URL(r.url).searchParams.get('offset')||0))});return json(result);
 }
 if(path==='offer-template'&&method==='GET'){if(!auth)error('Войдите в аккаунт.',401);const {result}=await mutate(ws,(s,time)=>offerTemplate(s,s.profiles[auth.account],Number(new URL(r.url).searchParams.get('offset')||0),time));return json(result);}
 if(path==='business-report'&&method==='GET'){if(!auth)error('Войдите в аккаунт.',401);const {result}=await mutate(ws,(s,time)=>reports(s,s.profiles[auth.account],new URL(r.url).searchParams.get('from'),new URL(r.url).searchParams.get('to'),time));return json(result);}
 if(path==='demo'&&method==='POST'){
  if(!testing(r))error('Тестовые профили отключены.',404);if(!['buyer','supplier','moderator'].includes(b.role))error('Недоступная роль.',403);
  const demoSpace=workspace(r);if(!demoSpace.startsWith('sandbox:'))error('Тестовый вход недоступен в рабочем пространстве.',403);
  const id=b.role==='moderator'?TEST_MODERATOR:demoProfiles[b.role].id;await mutate(demoSpace,s=>{if(id===TEST_MODERATOR)s.profiles[id]={...testModeratorProfile}});return json({ok:true},200,{'Set-Cookie':await startSession(r,id,workspace(r))});
 }
 if(path==='register'&&method==='POST'){
  const normalized=phone(b.phone);if(typeof b.password!=='string'||b.password.length<8||b.password.length>128)error('Пароль — от 8 до 128 символов.');
  if(!b.agreement||!b.privacy)error('Примите тестовые условия и согласие на обработку данных.');
  // Legal drafts and email provider are not production-ready: registration remains in the closed test contour.
  if(!testing(r))error('Регистрация откроется после подключения почты и утверждения документов.',503);
  const id=crypto.randomUUID(),profile={id,phone:normalized,name:'',contact:'',city:'',email:'',verified:false,complete:false,supplier:!!b.supplier,approved:false,plan:null,consent:{agreement:'v64-draft',privacy:'v64-draft',time:Date.now()}};
  enrollNewAccount(profile);
  try{await db().prepare('INSERT INTO accounts (id,phone,password,profile) VALUES (?,?,?,?)').bind(id,normalized,await passwordHash(b.password),JSON.stringify(profile)).run()}catch(e){if(String(e).includes('UNIQUE'))error('Не удалось зарегистрироваться с этими данными.',409);throw e;}
  await mutate(ws,s=>{s.profiles[id]=profile});return json({ok:true},201,{'Set-Cookie':await startSession(r,id,ws)});
 }
 if(path==='login'&&method==='POST'){
  const normalized=phone(b.phone);if(typeof b.password!=='string'||b.password.length>128)error('Проверьте телефон и пароль.',401);
  const key=await hash(normalized),now=Date.now();
  await db().prepare('INSERT INTO login_attempts (key,count,reset) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset<=? THEN 1 ELSE count+1 END, reset=CASE WHEN reset<=? THEN excluded.reset ELSE reset END').bind(key,now+300000,now,now).run();
  const attempt=await db().prepare('SELECT count FROM login_attempts WHERE key=?').bind(key).first();if(attempt.count>10)error('Слишком много попыток. Повторите через 5 минут.',429);
  const a=await db().prepare('SELECT * FROM accounts WHERE phone=?').bind(normalized).first();
  // Do equal-cost work for a missing account as well.
  const candidate=await passwordHash(b.password,a?.password.split(':')[0]||'0'.repeat(64));
  if(!a||candidate!==a.password)error('Проверьте телефон и пароль.',401);
  await db().prepare('DELETE FROM login_attempts WHERE key=?').bind(key).run();
  await mutate(ws,s=>{restoreAccountProfile(s,a)});return json({ok:true},200,{'Set-Cookie':await startSession(r,a.id,ws)});
 }
 if(path==='logout'&&method==='POST'){
  if(auth){if(b.all)await db().prepare('DELETE FROM sessions WHERE account=?').bind(auth.account).run();else {const t=(r.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);await db().prepare('DELETE FROM sessions WHERE token=?').bind(await hash(t)).run();}}
  return json({ok:true},200,{'Set-Cookie':cookie(r,'',0)});
 }
 if(path==='action'&&method==='POST'){
  if(!auth)error('Войдите в аккаунт.',401);
  if(b.action==='profile'&&b.email&&db().accountEmailReady&&!(await db().accountEmailReady()))error('Изменение email временно недоступно. Обратитесь в поддержку.',503);
  if(typeof b.operationId!=='string'||!/^[-a-zA-Z0-9]{16,80}$/.test(b.operationId))error('Не указан идентификатор операции.',400);
  const fingerprint=await hash(JSON.stringify({...b,operationId:undefined}));
  const {result}=await mutate(ws,async (s,time)=>{ensureInventory(s,time);ensureBoard(s,time,testing(r));const u=s.profiles[auth.account];if(!u)error('Сеанс недействителен.',401);const key=u.id+':'+b.operationId;
   const moderationContext={...staffContext};
   if(typeof b.action==='string'&&b.action.startsWith('moderation-')){if(testing(r)&&u.id===TEST_MODERATOR)requireTestModerator(u,moderationContext);else {await requireHomeEditor(s,u,staffContext,true,time,'moderation');moderationContext.productionAuthorized=true;}}
   if(u.id===TEST_MODERATOR&&(typeof b.action!=='string'||!b.action.startsWith('moderation-')))error('Тестовый модератор работает только с очередью контента.',403);
   if(s.receipts[key]){if(s.receipts[key].fingerprint!==fingerprint)error('Идентификатор уже использован для другой операции.',409);return s.receipts[key].result;}
   if(b.action==='profile'&&b.email){const normalized=String(b.email).trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))error('Проверьте email.');if(Object.values(s.profiles).some(p=>p.id!==u.id&&p.email?.toLowerCase()===normalized))error('Не удалось сохранить этот email.');b.email=normalized;}
   let result;
   if(typeof b.action==='string'&&b.action.startsWith('moderation-'))result=moderationAction(s,u,b,moderationContext,time);
   else if(b.action==='email-send'){
    if(!testing(r))error('Почтовый сервис ещё не подключён.',503);
    const bytes=crypto.getRandomValues(new Uint32Array(1));const code=String(bytes[0]%1000000).padStart(6,'0');
    result=await issueEmailCode(s,u,{id:crypto.randomUUID(),code},time);
   }else if(b.action==='email-verify'){
    result=testing(r)?await verifyEmailCode(s,u,b.code,time):await confirmProductionEmail(s,u,b.code,env.EMAIL_CODE_SECRET,time);
   }else if(typeof b.action==='string'&&b.action.startsWith('tariff-'))result=subscriptionAction(s,u,b,time);
   else if(b.action==='supplier-submit')result=submitSupplier(u,b.profileVersion,time,s);
   else if(b.action==='company-submit')result=submitBuyer(u,b.profileVersion,time,s);
   else if(['privacy-marketing','privacy-delete-request'].includes(b.action))result=privacyAction(s,u,b,time);
   else if(typeof b.action==='string'&&b.action.startsWith('conversation-'))result=conversationAction(s,u,b,time);
   else if(typeof b.action==='string'&&b.action.startsWith('board-'))result=boardAction(s,u,b,time);
   else if(b.action==='import-preview')result=await previewReceipt(s,u,b,time);
   else if(b.action==='import-apply')result=await applyReceipt(s,u,b,time);
   else if(b.action==='offers-preview')result=await previewOffers(s,u,b,time);
   else if(b.action==='offers-apply')result=await applyOffers(s,u,b,time);
   else if(b.action==='publish'){const p=s.products.find(p=>p.id===b.id&&p.supplierId===u.id);if(!p||await inventoryVersion(p)!==b.version)error('Предложение изменилось. Обновите экран.',409);result=apply(s,u,b,time);}
   else if(['review','case-open','case-message','offer-update','offer-renew','shortage','batch-close'].includes(b.action))result=await businessAction(s,u,b,time);
   else if(b.action==='assembly-create')result=createAssembly(s,u,b,time);
   else if(b.action==='assembly-progress')result=setAssemblyProgress(s,u,b);
   else if(b.action==='assembly-ready')result=await batchReady(s,u,b,apply,time);
   else result=apply(s,u,b,time);
   if(b.action==='profile'&&b.submitForReview===true){const p=s.profiles[u.id];result={...result,...(p.supplier?submitSupplier(p,p.profileVersion||0,time,s):submitBuyer(p,p.profileVersion||0,time,s))};}
   s.receipts[key]={fingerprint,result,time:Date.now()};return result;});if(b.action==='privacy-delete-request')await deliverDeletionNotice(ws);return json(result);
 }
 return json({error:'Раздел API не найден.'},404);
 }catch(e){console.error(e instanceof DomainError?e.message:'Platform request failed '+e?.name);if(local(r)&&!(e instanceof DomainError))console.error({busy:/busy|locked/i.test(String(e?.message)),frames:String(e?.stack||'').split('\n').slice(1,4).join('\n')});return json({error:e instanceof DomainError?e.message:'Не удалось сохранить данные. Повторите попытку.'},e instanceof DomainError?e.status:500);}}
async function monitored(r){const started=performance.now(),id=crypto.randomUUID();const response=await handle(r);const path=new URL(r.url).pathname.split('/').at(-1);const allowed=['state','catalog','action','operations','monitoring','payments','billing-admin','staff-security','maintenance','login','register','auth-code-send','auth-code-check','home-content','catalog-admin','platform-settings'];try{env.RECORD_REQUEST?.({id,path:allowed.includes(path)?path:'other',status:response.status,duration:performance.now()-started,time:Date.now()})}catch{}response.headers.set('X-Request-ID',id);return response;}
export const GET=monitored;export const POST=monitored;
