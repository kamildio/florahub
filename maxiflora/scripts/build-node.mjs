import {spawnSync} from 'node:child_process';
import {cp,mkdir} from 'node:fs/promises';
const result=spawnSync(process.execPath,['node_modules/next/dist/bin/next','build','--webpack'],{stdio:'inherit',env:{...process.env,MAXIFLORA_RUNTIME:'node'}});
if(result.status!==0)process.exit(result.status||1);
await mkdir('.next-node/standalone/.next-node',{recursive:true});
await cp('public','.next-node/standalone/public',{recursive:true});
await cp('.next-node/static','.next-node/standalone/.next-node/static',{recursive:true});
console.log('Node server prepared. Startup file: app.cjs');
