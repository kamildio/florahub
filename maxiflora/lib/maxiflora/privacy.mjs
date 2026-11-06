import {DomainError} from './engine.mjs';
import {PRIVACY_VERSION} from './privacy-policy.mjs';
export function privacyAction(s,u,b,now=Date.now()){
 if(!u)throw new DomainError('Войдите в аккаунт.',401);
 if(b.action!=='privacy-marketing'||typeof b.enabled!=='boolean')throw new DomainError('Укажите свой выбор.',422);
 const prior=u.marketingConsent?.enabled===true;
 if(prior===b.enabled&&u.marketingConsent)return {saved:true,enabled:b.enabled};
 const entry={account:u.id,name:u.contact||u.consent?.name||u.name||'',version:PRIVACY_VERSION,time:now,enabled:b.enabled,channel:'cabinet',source:'settings'};
 u.marketingConsent={...entry};u.consentHistory??=[];u.consentHistory.push({kind:'marketing',...entry});
 return {saved:true,enabled:b.enabled};
}
export const marketingAllowed=u=>u?.marketingConsent?.enabled===true&&u.marketingConsent.version===PRIVACY_VERSION;
