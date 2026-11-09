import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {telegramCurl} from '../server/telegram-transport.mjs';import {checkPaymentBot} from '../server/payment-notice-check.mjs';
test('curl credential stays in stdin; TLS remains verified; status preserved',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'maxiflora-curl-')),previous=process.env.PATH,capture=join(folder,'capture.json');
 try{await writeFile(join(folder,'curl'),`#!/usr/bin/env node\n(async()=>{let input='';for await(const c of process.stdin)input+=c;require('node:fs').writeFileSync(${JSON.stringify(capture)},JSON.stringify({args:process.argv.slice(2),input}));process.stdout.write('{"ok":false}\\n400');})();`,{mode:0o700});process.env.PATH=folder+':'+previous;
 const token='123456789:'+ 'x'.repeat(30),r=await telegramCurl('https://api.telegram.org/bot'+token+'/getMe',{method:'POST',body:'{}'});assert.equal(r.status,400);assert.equal((await r.json()).ok,false);const c=JSON.parse(await readFile(capture,'utf8'));assert.equal(c.args.join(' ').includes(token),false);assert.ok(c.input.includes(token));assert.ok(c.args.includes('--ipv4'));assert.equal(c.args.includes('--insecure'),false);assert.equal(c.args.includes('-k'),false);
 await assert.rejects(telegramCurl('https://example.test/bot'+token+'/getMe',{method:'POST',body:'{}'}));
 }finally{process.env.PATH=previous;await rm(folder,{recursive:true,force:true})}
});
test('smoke test checks bot, private recipient and delivery without enabling billing',async()=>{
 const settings={PAYMENTS_BOT_TOKEN:'123456789:'+ 'x'.repeat(30),PAYMENTS_CHAT_ID:'123456789',MANUAL_PAYMENTS_ENABLED:'false'};let calls=[];
 const response=async(url,opts)=>{const method=url.split('/').at(-1);calls.push(method);const result=method==='getMe'?{username:'MaXiFlora_Oficial_bot'}:method==='getChat'?{type:'private',id:123456789}:{chat:{id:123456789},message_id:1};return new Response(JSON.stringify({ok:true,result}))};
 const checked=await checkPaymentBot(settings,response);assert.equal(checked.ok,true);assert.equal(checked.paymentsEnabled,false);assert.deepEqual(calls,['getMe','getChat','sendMessage']);
 const denied=await checkPaymentBot(settings,async()=>new Response(JSON.stringify({ok:false,description:'Bad Request: chat not found'}),{status:400}));assert.equal(denied.error,'RECIPIENT_CHAT_NOT_FOUND');assert.equal(JSON.stringify(denied).includes(settings.PAYMENTS_BOT_TOKEN),false);
});
