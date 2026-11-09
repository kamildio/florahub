// Explicit hosting-owner CLI action. Does not send money or grant subscription access.
import {readFile,writeFile,rename} from 'node:fs/promises';
import {billingConfigured} from '../lib/maxiflora/manual-payments.mjs';
async function main(){
 if(!process.argv.includes('--enable-payments'))throw new Error('EXPLICIT_ENABLE_REQUIRED');
 const root=new URL('../',import.meta.url),config=new URL('.payments-private.env',root);process.loadEnvFile(config);
 if(!billingConfigured({...process.env,MANUAL_PAYMENTS_ENABLED:'true'}))throw new Error('PAYMENT_CONFIGURATION_INCOMPLETE');
 const check=JSON.parse(await readFile(new URL('.payments-test-status.json',root),'utf8')),time=Date.parse(check.checkedAt);
 if(check.ok!==true||check.telegramAccepted!==true||check.privateRecipientVerified!==true||check.bot!=='MaXiFlora_Oficial_bot'||!Number.isFinite(time)||Date.now()-time>86400000||time>Date.now()+60000)throw new Error('RECENT_TELEGRAM_TEST_REQUIRED');
 const previous=await readFile(config,'utf8'),updated=/^MANUAL_PAYMENTS_ENABLED=.*$/m.test(previous)?previous.replace(/^MANUAL_PAYMENTS_ENABLED=.*$/gm,'MANUAL_PAYMENTS_ENABLED=true'):previous+'\nMANUAL_PAYMENTS_ENABLED=true\n';
 const temp=new URL('.payments-private.tmp',root);await writeFile(temp,updated,{mode:0o600});await rename(temp,config);console.log(JSON.stringify({ok:true,manualPaymentsEnabled:true,restartRequired:true}));
}
main().catch(e=>{console.log(JSON.stringify({ok:false,error:['EXPLICIT_ENABLE_REQUIRED','PAYMENT_CONFIGURATION_INCOMPLETE','RECENT_TELEGRAM_TEST_REQUIRED'].includes(e.message)?e.message:'PAYMENTS_ENABLE_FAILED'}));process.exitCode=1});
