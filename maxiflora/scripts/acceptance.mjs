// Isolated HTTP acceptance: synthetic in-memory data, no production credentials or network services.
import {register} from 'node:module';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
register('../tests/fixtures/acceptance-loader.mjs',import.meta.url);
const {GET,POST}=await import('../app/api/platform/[...path]/route.js');
const server=createServer(async(req,res)=>{try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);const request=new Request('http://127.0.0.1:'+server.address().port+req.url,{method:req.method,headers:req.headers,...(body.length?{body,duplex:'half'}:{})});const result=await (req.method==='POST'?POST:GET)(request);res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));}catch{res.writeHead(500);res.end('{}')}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port;
const suites=['role-access-api','admin-role-journey-api','operations-api','manual-payments-api','platform-settings-api','catalog-admin-api','phone-auth-api','catalog-api','api-integration','stage-two-api','business-api','inventory-api','offers-api','offer-publication-api','subscriptions-api','tariff-history-api','conversations-api','board-api','board-reports-api','staff-security-api'];
let failed=0;
try{for(const suite of suites){console.log('\n'+suite);const code=await new Promise(resolve=>{const child=spawn(process.execPath,['tests/'+suite+'.mjs'],{stdio:'inherit',env:{...process.env,MAXIFLORA_TEST_URL:url}});child.on('exit',resolve);child.on('error',()=>resolve(1))});if(code!==0)failed++;}}finally{await new Promise(resolve=>server.close(resolve))}
console.log(`\nHTTP acceptance: ${suites.length-failed}/${suites.length} suites passed.`);if(failed)process.exitCode=1;
