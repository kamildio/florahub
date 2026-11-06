import {apply,DomainError} from './engine.mjs';
import {boardAction} from './board.mjs';
import {ensureMessageSequences,recordMessage} from './message-sequence.mjs';
const fail=(message,status=422)=>{throw new DomainError(message,status)};
function groups(s,u){
 const all=new Map();if(!u)return all;
 const byOrder=new Map();for(const m of s.messages||[])if(m.from===u.id||m.to===u.id){if(!byOrder.has(m.orderId))byOrder.set(m.orderId,[]);byOrder.get(m.orderId).push(m);}
 const group=peer=>{if(!all.has(peer))all.set(peer,{peerId:peer,peer:s.profiles[peer]?.name||'Контрагент',contexts:[],messages:[]});return all.get(peer)};
 for(const o of s.orders||[]){
  if(![o.buyerId,o.supplierId].includes(u.id))continue;
  const peer=o.buyerId===u.id?o.supplierId:o.buyerId,g=group(peer),key='order:'+o.id;
  g.contexts.push({key,kind:'order',id:o.id,title:'Заказ № '+o.id,status:o.status,side:o.supplierId===u.id?'supplier':'buyer'});
  g.messages.push(...(byOrder.get(o.id)||[]).filter(m=>(m.from===u.id&&m.to===peer)||(m.from===peer&&m.to===u.id)).map(m=>({...m,scope:key})));
 }
 for(const thread of s.boardThreads||[]){
  if(thread.participants.length!==2||!thread.participants.includes(u.id))continue;
  const peer=thread.participants.find(id=>id!==u.id),g=group(peer),key='board:'+thread.id;
  g.contexts.push({key,kind:'board',id:thread.id,adId:thread.adId,title:thread.adTitle});
  g.messages.push(...thread.messages.filter(m=>thread.participants.includes(m.from)).map(m=>({...m,scope:key})));
 }
 for(const m of s.directMessages||[]){if(m.from===u.id||m.to===u.id)group(m.from===u.id?m.to:m.from).messages.push({...m,scope:'general'});}
 for(const g of all.values())g.messages.sort((a,b)=>a.sequence-b.sequence);
 return all;
}
const cursor=(s,userId,peer,scope)=>s.conversationReads?.[userId]?.[peer]?.[scope]||0;
export function conversationView(s,u){
 ensureMessageSequences(s);
 const conversations=[...groups(s,u).values()].map(g=>{
  const messages=g.messages.map(m=>({id:m.id,sequence:m.sequence,text:m.text,time:m.time,own:m.from===u.id,scope:m.scope,read:m.from===u.id&&cursor(s,g.peerId,u.id,m.scope)>=m.sequence,unread:m.from!==u.id&&m.sequence>cursor(s,u.id,g.peerId,m.scope)}));
  return {peerId:g.peerId,peer:g.peer,contexts:g.contexts,messages,unreadCount:messages.filter(m=>m.unread).length,lastSequence:messages.at(-1)?.sequence||0};
 }).sort((a,b)=>b.lastSequence-a.lastSequence||a.peer.localeCompare(b.peer));
 return {inbox:{conversations,unreadCount:conversations.reduce((n,g)=>n+g.unreadCount,0)}};
}
export function conversationAction(s,u,b,now=Date.now()){
 if(!u)fail('Войдите для переписки.',401);ensureMessageSequences(s);
 const g=groups(s,u).get(b.peerId);if(!g||b.peerId===u.id)fail('Диалог недоступен.',404);
 if(b.action==='conversation-read'){
  if(b.contextKey!=='all'&&b.contextKey!=='general'&&!g.contexts.some(c=>c.key===b.contextKey))fail('Контекст диалога недоступен.',404);
  const visible=g.messages.filter(m=>b.contextKey==='all'||m.scope===b.contextKey);
  if(!Number.isSafeInteger(b.throughSequence)||!visible.some(m=>m.sequence===b.throughSequence))fail('Обновите диалог перед отметкой прочтения.',409);
  s.conversationReads??={};s.conversationReads[u.id]??={};const read=s.conversationReads[u.id][g.peerId]??={};
  for(const m of visible)if(m.sequence<=b.throughSequence)read[m.scope]=Math.max(read[m.scope]||0,m.sequence);
  for(const n of s.notifications||[])if(n.target==='conversation'&&n.users.includes(u.id)&&n.peerId===g.peerId&&n.sequence<=b.throughSequence&&(b.contextKey==='all'||n.contextKey===b.contextKey)){n.readBy??=[];if(!n.readBy.includes(u.id))n.readBy.push(u.id);}
  return {ok:true,throughSequence:b.throughSequence};
 }
 if(b.action==='conversation-send'){
  if(typeof b.text!=='string'||!b.text.trim()||b.text.length>2000)fail('Введите сообщение до 2000 символов.');
  if(b.contextKey==='general'){
   const message={id:crypto.randomUUID(),from:u.id,to:g.peerId,text:b.text.trim(),time:now};recordMessage(s,message,g.peerId,'general');s.directMessages??=[];s.directMessages.push(message);
  }else{
   const c=g.contexts.find(c=>c.key===b.contextKey);if(!c)fail('Контекст диалога недоступен.',404);
   if(c.kind==='order')apply(s,u,{action:'message',id:c.id,text:b.text},now);
   else boardAction(s,u,{action:'board-message',threadId:c.id,text:b.text},now);
  }
  return {peerId:g.peerId,contextKey:b.contextKey};
 }
 fail('Действие диалога недоступно.',403);
}
