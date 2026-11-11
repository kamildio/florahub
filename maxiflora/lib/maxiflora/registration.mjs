import {REGISTRATION_CHECKBOX_VERSION} from './registration-consent.mjs';
import {requirePhoneConsent,phoneChannel,phoneMethod,verifiedPhoneMethod,channelConsentVersion} from './phone-channels.mjs';
import {PRIVACY_VERSION} from './privacy-policy.mjs';
import {DomainError} from './engine.mjs';
import {normalizePhone} from './auth-codes.mjs';
import {enrollNewAccount} from './subscriptions.mjs';
export const CONSENT_VERSION='launch-v3';
const fail=(message,status=422)=>{throw new DomainError(message,status)};
export function registrationDetails(input){
 const phone=normalizePhone(input.phone),name=typeof input.name==='string'?input.name.trim():'',email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
 if(!name||name.length>120||/[\u0000-\u001f\u007f]/.test(name))fail('Укажите имя от 1 до 120 символов.');
 if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Укажите корректный email.');
 if(typeof input.password!=='string'||input.password.length<8||input.password.length>128)fail('Пароль — от 8 до 128 символов.');
 if(input.password!==input.passwordConfirmation)fail('Пароли не совпадают.');
 if(input.agreement!==true||input.privacy!==true)fail('Примите условия использования и согласие на обработку данных.');
 const channel=input.channel==='email'?'email':requirePhoneConsent(input);
 if(input.consentPresentation!==undefined&&(input.consentPresentation!==REGISTRATION_CHECKBOX_VERSION||input.marketing!==false))fail('Проверьте согласие и настройки сообщений.');
 if(input.marketing!==undefined&&typeof input.marketing!=='boolean')fail('Выберите настройку сообщений об акциях.');
 return {phone,name,email,channel,consentPresentation:input.consentPresentation||'separate-checkboxes',password:input.password,supplier:input.supplier===true,marketing:input.marketing===true};
}
// Called only after a committed phone challenge proves ownership. Never take roles from client input.
export async function createVerifiedAccount(database,input,proof,hashPassword,now=Date.now()){
 const details=registrationDetails(input);
 const emailSignup=details.channel==='email';
 if((emailSignup?proof?.channel!=='email'||proof.email!==details.email:phoneChannel(proof?.channel)!==details.channel||proof?.phone!==details.phone)||proof?.ok!==true||proof.purpose!=='register'||!Number.isSafeInteger(proof.verifiedAt)||proof.verifiedAt>now||now-proof.verifiedAt>300000)fail(emailSignup?'Подтвердите email заново.':'Подтвердите номер заново.',403);
 if(database.accountEmailReady&&!(await database.accountEmailReady()))fail('Регистрация временно недоступна. Попробуйте позже.',503);
 if(await database.prepare('SELECT * FROM accounts WHERE email=?').bind(details.email).first())fail('Не удалось зарегистрироваться с этими контактами. Используйте свой аккаунт или обратитесь в поддержку.',409);
 if(await database.prepare('SELECT * FROM accounts WHERE phone=?').bind(details.phone).first())fail('Аккаунт уже существует. Войдите по коду или восстановите пароль.',409);
 const id=crypto.randomUUID(),profile={id,phone:details.phone,name:'',email:details.email,contact:details.name,companyType:'',city:'',verified:false,phoneVerified:true,phoneVerificationMethod:emailSignup?null:phoneMethod(details.channel),phoneVerifiedAt:proof.verifiedAt,complete:false,supplier:details.supplier,approved:false,supplierStatus:'draft',profileVersion:0,plan:null,consent:{presentation:details.consentPresentation,agreement:CONSENT_VERSION,privacy:PRIVACY_VERSION,name:details.name,account:id,time:now,accepted:true,phoneMethod:emailSignup?null:phoneMethod(details.channel)},[details.channel+'Consent']:{presentation:details.consentPresentation,version:emailSignup?PRIVACY_VERSION:channelConsentVersion(details.channel),accepted:true,time:now,account:id,name:details.name},marketingConsent:{version:PRIVACY_VERSION,enabled:details.marketing,time:now,account:id,name:details.name,channel:'cabinet'}};
 if(emailSignup){
  profile.phoneVerified=false;
  delete profile.phoneVerifiedAt;
  delete profile.emailConsent;
  profile.verified=true;
  profile.verificationMethod='email';
  profile.verifiedAt=proof.verifiedAt;
  profile.emailVerification={email:details.email,verifiedAt:proof.verifiedAt,challengeId:proof.challengeId,method:'smtp-code'};
 }
 profile.consentHistory=[{kind:'personal-data',...profile.consent},...(emailSignup?[]:[{kind:details.channel,...profile[details.channel+'Consent']}]),{kind:'marketing',...profile.marketingConsent}];
 enrollNewAccount(profile,now);
 const encoded=JSON.stringify(profile),password=await hashPassword(details.password);
 try{await database.prepare('INSERT INTO accounts (id,phone,email,password,profile) VALUES (?,?,?,?,?)').bind(id,details.phone,details.email,password,encoded).run()}catch(e){if(String(e).includes('UNIQUE'))fail('Аккаунт уже существует. Войдите по коду.',409);throw e;}
 return {id,phone:details.phone,profile:encoded};
}
// Preserve workspace edits and the original trial when repairing a partial signup on the next login.
export function restoreAccountProfile(state,account){
 if(state.profiles[account.id])return state.profiles[account.id];
 const profile=JSON.parse(account.profile);
 if(profile.id!==account.id||profile.phone!==account.phone)fail('Данные аккаунта требуют проверки поддержки.',503);
 state.profiles[account.id]=profile;return profile;
}
export const contactConfirmed=u=>!!(u&&(u.verified===true||(u.phoneVerified===true&&verifiedPhoneMethod(u.phoneVerificationMethod))));
