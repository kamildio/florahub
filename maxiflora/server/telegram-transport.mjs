// Hosting-compatible transport. The credential-bearing URL travels through stdin,
// never command arguments, environment variables added here, logs or public state.
import {spawn} from 'node:child_process';
const quote=value=>'"'+String(value).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r/g,'\\r').replace(/\n/g,'\\n')+'"';
export async function telegramCurl(url,options={}){
 if(typeof url!=='string'||!/^https:\/\/api\.telegram\.org\/bot\d{6,16}:[A-Za-z0-9_-]{20,}\/(getMe|getChat|sendMessage|getUpdates)$/.test(url))throw new Error('TELEGRAM_ENDPOINT_INVALID');
 if(options.method!=='POST'||typeof options.body!=='string'||options.body.length>16000)throw new Error('TELEGRAM_REQUEST_INVALID');
 const config=['url = '+quote(url),'request = "POST"','header = "Content-Type: application/json"','data = '+quote(options.body)].join('\n')+'\n';
 return new Promise((resolve,reject)=>{
  const child=spawn('curl',['--silent','--show-error','--ipv4','--noproxy','*','--proto','=https','--connect-timeout','10','--max-time','15','--write-out','\n%{http_code}','--config','-'],{stdio:['pipe','pipe','pipe']});
  let output='',settled=false;const finish=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(new Error(error)):resolve(result)};
  const timer=setTimeout(()=>{child.kill();finish('TELEGRAM_CURL_TIMEOUT')},18000);
  child.stdout.on('data',chunk=>{output+=chunk.toString();if(Buffer.byteLength(output)>131072){child.kill();finish('TELEGRAM_RESPONSE_LIMIT')}});
  child.stderr.on('data',()=>{});child.stdin.on('error',()=>{});child.on('error',()=>finish('TELEGRAM_CURL_UNAVAILABLE'));
  child.on('close',code=>{if(code!==0){finish(code===28?'TELEGRAM_CURL_TIMEOUT':'TELEGRAM_CURL_FAILED');return}const at=output.lastIndexOf('\n'),status=Number(output.slice(at+1));if(!Number.isInteger(status)||status<100||status>599){finish('TELEGRAM_RESPONSE_INVALID');return}finish(null,new Response(output.slice(0,at),{status,headers:{'content-type':'application/json'}}))});
  child.stdin.end(config);
 });
}
