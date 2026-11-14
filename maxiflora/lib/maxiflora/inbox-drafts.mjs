export const inboxDraftKey=id=>'maxiflora-message-drafts:'+id;
export function safeInboxDrafts(value){if(!value||Array.isArray(value)||typeof value!=='object')return {};return Object.fromEntries(Object.entries(value).filter(([k,v])=>k.length<=200&&k.includes('|')&&typeof v==='string'&&v.length<=2000&&v.trim()).slice(-30));}
