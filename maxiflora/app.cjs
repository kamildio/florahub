// Plesk Passenger supplies PORT. Standalone server starts in production mode.
process.env.NODE_ENV='production';
process.env.MAXIFLORA_APP_ROOT=__dirname;
// Private fallback for hosting secrets not forwarded by Passenger. Never packaged.
const secretsFile=__dirname+'/.runtime-secrets.env';
try{const fs=require('node:fs');if(!fs.existsSync(secretsFile))fs.writeFileSync(secretsFile,'',{mode:0o600,flag:'wx'});fs.chmodSync(secretsFile,0o600);process.loadEnvFile(secretsFile)}catch{console.error('MaXiFlora private settings: unavailable')}
// Separate mail credential file is created once, never included in a release.
try{const fs=require('node:fs'),file=__dirname+'/.smtp-private.env';if(!fs.existsSync(file))fs.writeFileSync(file,'SMTP_HOST=pkz20.hoster.kz\nSMTP_PORT=465\nSMTP_USER=noreply@maxiflora.kz\nSMTP_FROM=noreply@maxiflora.kz\nSMTP_PASSWORD=\n',{mode:0o600,flag:'wx'});fs.chmodSync(file,0o600);process.loadEnvFile(file)}catch{console.error('MaXiFlora mail settings: unavailable')}
// Owner designation is separate from the server-only MFA encryption key.
// Empty owner file grants no access. Neither private file is packaged or exposed.
try{
 const fs=require('node:fs'),ownerFile=__dirname+'/.staff-owner-id',keyFile=__dirname+'/.staff-mfa-key';
 if(!fs.existsSync(ownerFile))fs.writeFileSync(ownerFile,'',{mode:0o600,flag:'wx'});
 fs.chmodSync(ownerFile,0o600);
 const owner=fs.readFileSync(ownerFile,'utf8').trim();
 if(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(owner)&&!process.env.STAFF_OWNER_ACCOUNT_ID)process.env.STAFF_OWNER_ACCOUNT_ID=owner;
 if(!process.env.STAFF_MFA_ENCRYPTION_KEY){
  if(!fs.existsSync(keyFile))fs.writeFileSync(keyFile,require('node:crypto').randomBytes(32).toString('hex'),{mode:0o600,flag:'wx'});
  fs.chmodSync(keyFile,0o600);const key=fs.readFileSync(keyFile,'utf8').trim();
  if(/^[a-f0-9]{64}$/i.test(key))process.env.STAFF_MFA_ENCRYPTION_KEY=key;
 }
}catch{console.error('MaXiFlora owner settings: unavailable')}
try{
 const fs=require('node:fs'),file=__dirname+'/.maintenance-key';
 if(!fs.existsSync(file))fs.writeFileSync(file,process.env.MAINTENANCE_SECRET||require('node:crypto').randomBytes(32).toString('hex'),{mode:0o600,flag:'wx'});
 fs.chmodSync(file,0o600);const key=fs.readFileSync(file,'utf8').trim();
 if(!process.env.MAINTENANCE_SECRET&&/^[a-f0-9]{64}$/i.test(key))process.env.MAINTENANCE_SECRET=key;
}catch{console.error('MaXiFlora maintenance settings: unavailable')}

// Bot credentials for manual billing are entered only on the hosting, never packaged.
try{const fs=require('node:fs'),file=__dirname+'/.payments-private.env';if(!fs.existsSync(file))fs.writeFileSync(file,'MANUAL_PAYMENTS_ENABLED=false\nPAYMENTS_BOT_TOKEN=\nPAYMENTS_CHAT_ID=\n',{mode:0o600,flag:'wx'});fs.chmodSync(file,0o600);process.loadEnvFile(file)}catch{console.error('MaXiFlora payment notification settings: unavailable')}

// Operational diagnostics contain setting names and error codes, never values.
const required=['MYSQL_HOST','MYSQL_DATABASE','MYSQL_USER','MYSQL_PASSWORD'];
const missing=required.filter(name=>!process.env[name]);
const runtimeStatus={};
const record=status=>{Object.assign(runtimeStatus,status);require('node:fs').writeFileSync(__dirname+'/.runtime-status.json',JSON.stringify({time:new Date().toISOString(),...runtimeStatus}),{mode:0o600})};
record({missing,telegram:{clientIdPresent:!!process.env.TELEGRAM_CLIENT_ID,clientIdExpected:process.env.TELEGRAM_CLIENT_ID==='9110754685',secretPresent:!!process.env.TELEGRAM_CLIENT_SECRET,gatewayTokenPresent:!!process.env.TELEGRAM_GATEWAY_TOKEN,gatewayTokenFormatReady:typeof process.env.TELEGRAM_GATEWAY_TOKEN==='string'&&process.env.TELEGRAM_GATEWAY_TOKEN.length>=32,secretFormatReady:typeof process.env.TELEGRAM_CLIENT_SECRET==='string'&&process.env.TELEGRAM_CLIENT_SECRET.length>=16}});
console.error('MaXiFlora configuration: '+(missing.length?'missing '+missing.join(','):'database settings present'));
if(!missing.length)import('./server/mysql-store.mjs').then(async ({nodeDatabase})=>{
  await nodeDatabase().prepare('SELECT 1 AS ok').first();
  const {loadState}=await import('./lib/maxiflora/store.mjs');
  await loadState(nodeDatabase(),'live');
  const {accountEmailStatus}=await import('./server/mysql-store.mjs');
  record({missing:[],database:'connected',workspace:'ready',accountEmails:accountEmailStatus()});
  console.error('MaXiFlora database: connected');
}).catch(error=>{const code=/^[A-Z0-9_]+$/.test(error.code||'')?error.code:'connection failed';record({missing:[],database:code});console.error('MaXiFlora database: '+code)});
const path=require('node:path');
const directory=path.join(__dirname,'.next-node/standalone');
const config=require(path.join(directory,'.next-node/required-server-files.json')).config;
process.env.__NEXT_PRIVATE_STANDALONE_CONFIG=JSON.stringify(config);
const app=require('next')({dev:false,dir:directory,conf:config,
 hostname:process.env.MAXIFLORA_LOCAL_PORT?'127.0.0.1':'www.maxiflora.kz',
 port:Number(process.env.MAXIFLORA_LOCAL_PORT||443)});
const handle=app.getRequestHandler();
record({server:'preparing',nodeExecutable:process.execPath});
app.prepare().then(()=>{
 const server=require('node:http').createServer((req,res)=>{
  if(!process.env.MAXIFLORA_LOCAL_PORT)req.headers['x-forwarded-proto']='https';
  return handle(req,res);
 });
 // Passenger intercepts listen() and supplies its own private socket.
 if(process.env.MAXIFLORA_LOCAL_PORT)server.listen(Number(process.env.MAXIFLORA_LOCAL_PORT),'127.0.0.1');
 else server.listen();
 record({server:'ready'});
}).catch(()=>{record({server:'preparation failed'});console.error('MaXiFlora server: preparation failed');process.exitCode=1});
