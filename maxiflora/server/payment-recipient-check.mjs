// One-time recipient lookup: never logs updates, messages, names or unrelated accounts.
import {telegramCurl} from './telegram-transport.mjs';
async function main(){
 const name=process.argv.find(x=>x.startsWith('--username='))?.slice(11).replace(/^@/,'').toLowerCase();if(!/^[a-z0-9_]{5,32}$/.test(name||''))throw new Error('USERNAME_REQUIRED');
 process.loadEnvFile(new URL('../.payments-private.env',import.meta.url));const token=process.env.PAYMENTS_BOT_TOKEN;
 if(!/^\d{6,16}:[A-Za-z0-9_-]{20,}$/.test(token||''))throw new Error('TOKEN_FORMAT_INVALID');
 const r=await telegramCurl('https://api.telegram.org/bot'+token+'/getUpdates',{method:'POST',body:JSON.stringify({timeout:0,limit:100})});const data=await r.json();if(!r.ok||!data.ok)throw new Error('UPDATES_UNAVAILABLE');
 const matches=(data.result||[]).map(x=>x.message).filter(m=>m?.chat?.type==='private'&&m.chat.username?.toLowerCase()===name&&String(m.from?.id)===String(m.chat.id));
 const ids=[...new Set(matches.map(m=>String(m.chat.id)))];console.log(JSON.stringify(ids.length===1?{ok:true,recipientId:ids[0],usernameMatched:true}:{ok:false,error:'MATCHING_START_NOT_FOUND'}));
}
main().catch(()=>{console.log(JSON.stringify({ok:false,error:'RECIPIENT_LOOKUP_UNAVAILABLE'}));process.exitCode=1});
