// A stable server sequence keeps late arrivals unread even if clocks are equal.
export function ensureMessageSequences(s){
 if(s.messageSequenceVersion===1&&Number.isSafeInteger(s.messageSequence))return;
 const messages=[...(s.messages||[]),...(s.boardThreads||[]).flatMap(t=>t.messages||[]),...(s.directMessages||[])];
 let last=messages.reduce((n,m)=>Math.max(n,Number.isSafeInteger(m.sequence)?m.sequence:0),s.messageSequence||0);
 const old=messages.filter(m=>!Number.isSafeInteger(m.sequence)).sort((a,b)=>a.time-b.time);
 for(const m of old)m.sequence=++last;s.messageSequence=last;s.messageSequenceVersion=1;
}
export function recordMessage(s,message,recipient,contextKey){
 ensureMessageSequences(s);message.sequence=++s.messageSequence;
 s.notifications??=[];s.notifications.unshift({id:crypto.randomUUID(),users:[recipient],target:'conversation',peerId:message.from,contextKey,sequence:message.sequence,text:'Новое сообщение от '+(s.profiles[message.from]?.name||'партнёра'),time:message.time});
 return message;
}
