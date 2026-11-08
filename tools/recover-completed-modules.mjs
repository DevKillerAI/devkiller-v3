// Operator recovery after an Engine validator/build fix. No provider calls.
// Usage: node tools/recover-completed-modules.mjs <worker-port> <project-id> <run-id>
// Stop that worker before invoking. Incomplete/uncertain receipts are refused.
import fs from 'node:fs/promises';
import path from 'node:path';
import {ProjectStore} from '../modules/projects.mjs';
import {RunStore} from '../modules/orchestrator.mjs';
import {parseApp} from '../modules/openai.mjs';
const [port,projectId,id]=process.argv.slice(2);
if(!/^\d{4,5}$/.test(port||''))throw Error('A worker port is required.');
let online=false;try{await fetch('http://127.0.0.1:'+port+'/api/state',{signal:AbortSignal.timeout(1000)});online=true;}catch{}
if(online)throw Error('Stop the worker before offline recovery.');
const projects=new ProjectStore(path.resolve('projects',port)),runs=new RunStore(projects),run=runs.get(projectId,id);
if(!['failed','paused'].includes(run.status)||run.callInFlight!==false||run.response||run.revision)throw Error('Only confirmed completed modules without a saved response can be recovered.');
const folder=path.join(path.dirname(projects.file(projectId)),'quality',id,'modules');
const names=(await fs.readdir(folder)).filter(n=>/^(foundation|features|integration)(-\d+)?\.json$/.test(n));
const rank=n=>['foundation','features','integration'].indexOf(n.split(/[-.]/)[0])*100+Number(n.match(/-(\d+)\.json$/)?.[1]||0);
names.sort((a,b)=>rank(a)-rank(b));
let final,fingerprint,usage={input:0,output:0,total:0};const files=new Map();
for(const name of names){const receipt=JSON.parse(await fs.readFile(path.join(folder,name),'utf8'));
 if(!['completed','partial','deferred'].includes(receipt.status)||!receipt.response?.files||fingerprint&&receipt.fingerprint!==fingerprint)throw Error('Unfinished or inconsistent receipt; no recovery performed.');
 fingerprint=receipt.fingerprint;final=receipt.response;
 for(const f of final.files)files.set(f.name,f);
 for(const k of Object.keys(usage))usage[k]+=final.usage?.[k]||0;
}
if(!names.some(n=>n.startsWith('foundation'))||!names.some(n=>n.startsWith('features'))||!names.at(-1)?.startsWith('integration'))throw Error('All three stages are required.');
const lastReceipt=JSON.parse(await fs.readFile(path.join(folder,names.at(-1)),'utf8'));if(lastReceipt.status!=='completed')throw Error('Integration must be complete.');
const response={...parseApp(JSON.stringify({...final,files:[...files.values()]}),run.job.stack),usage,modular:true};
await fs.copyFile(projects.file(projectId),path.join(folder,'before-validator-recovery.sqlite'));
runs.change(projectId,id,'operator.completed-modules-recovered',r=>{r.response=response;r.status='paused';r.owner=null;r.stage='saving';r.usage=usage;r.usageState='confirmed';r.result='Completed provider modules revalidated by the updated Engine. No provider call repeated.';});
console.log(JSON.stringify({status:'ready-to-resume',files:response.files.length,providerCallsRepeated:0}));
