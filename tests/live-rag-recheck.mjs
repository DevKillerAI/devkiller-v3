// Local replay of every saved artifact, with no generation or embedding calls.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {createServer,delay} from './knowledge-server.mjs';
import {verifyGeneratedApp} from './rag-browser-verifier.mjs';
const input=process.argv[2];if(!input)throw new Error('Pass the completed study folder.');
const source=path.resolve(input),folder=path.join(source,process.argv.includes('--tasks-only')?'task-label-recheck':'dialog-recheck');
await fs.mkdir(folder,{recursive:true});
const server=await createServer(),browser=await chromium.launch({headless:true}),reports=[];
try{
 while(true){
  const originals=JSON.parse(await fs.readFile(path.join(source,'results.json'),'utf8'));
  for(const original of originals){
    if(process.argv.includes('--tasks-only')&&original.case!=='tasks')continue;
    if(reports.some(r=>r.name===original.name))continue;
    if(!original.verification.total){reports.push({name:original.name,kind:original.kind,mode:original.mode,case:original.case,verification:original.verification,skipped:'No generated artifact available'});continue;}
    const file=await fs.readFile(path.join(source,original.name+'-files.json'),'utf8'),artifact=JSON.parse(file);
    await server.post('projects/new');await server.post('start',{files:artifact.files,stack:artifact.stack});const state=await server.ready();
    const verification=await verifyGeneratedApp({browser,folder,kind:original.case==='expenses'||original.case==='inventory'||original.case==='tasks'?original.case:'repair',url:state.previewUrl,name:original.name});
    reports.push({name:original.name,kind:original.kind,mode:original.mode,case:original.case,artifactHash:createHash('sha256').update(file).digest('hex'),originalVerification:original.verification,verification});
    await fs.writeFile(path.join(folder,'results.json'),JSON.stringify(reports,null,2));console.log(`${original.name}: ${verification.passed}/${verification.total}`);
  }
  const manifest=JSON.parse(await fs.readFile(path.join(source,'manifest.json'),'utf8'));
  if(!process.argv.includes('--follow'))break;
  if(manifest.finishedAt){const latest=JSON.parse(await fs.readFile(path.join(source,'results.json'),'utf8'));if(latest.filter(r=>!process.argv.includes('--tasks-only')||r.case==='tasks').every(r=>reports.some(done=>done.name===r.name)))break;}
  await delay(3000);
 }
  await fs.writeFile(path.join(folder,'results.json'),JSON.stringify(reports,null,2));const status=await(await fetch(server.origin+'/api/knowledge')).json();if(status.usage.calls!==0)throw new Error('Replay unexpectedly used embeddings.');
  await fs.writeFile(path.join(folder,'manifest.json'),JSON.stringify({finishedAt:new Date().toISOString(),method:'Same generated files, original prompts and checks; native and in-page confirmation dialogs accepted; asynchronous completion checkbox clicked and outcome awaited. Original results retained. Clean database for each artifact. No model or embedding calls.',trials:reports.length,embeddingCalls:status.usage.calls},null,2));
}finally{await browser.close();await server.cleanup();}
