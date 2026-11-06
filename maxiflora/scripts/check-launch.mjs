import {launchReadiness} from '../server/launch-readiness.mjs';
const result=launchReadiness(process.env);
console.log(JSON.stringify(result,null,2));
// Intentionally nonzero until commercial launch requirements are completed.
process.exitCode=result.readyForClients?0:1;
