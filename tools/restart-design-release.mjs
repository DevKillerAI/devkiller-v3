// Restart checkpoint records only IDs and hashes; never stores the panel token.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {ProjectStore} from '../modules/projects.mjs';
import {digest} from '../modules/knowledge.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),origin='http://127.0.0.1:4310';
const checkpoint=path.join(root,'.runtime','design-release-restart.json');
const store=new ProjectStore(path.join(root,'projects','4310'));
const get=async route=>{const r=await fetch(origin+route);if(!r.ok)throw new Error('HTTP '+r.status);return r.json();};
const fingerprint=(id,revision)=>({source:digest(JSON.stringify(store.version(id,revision).files)),data:store.use(id,db=>digest(JSON.stringify(db.prepare('SELECT key,value FROM app_data ORDER BY key').all()))),jobs:store.details(id).jobs.length});
async function post(route,body={}){const state=await get('/api/state');if(state.busy)throw new Error('Engine is busy; no restart or restore performed.');const r=await fetch(origin+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-DevKiller-Token':state.token},body:JSON.stringify(body)});if(!r.ok)throw new Error('HTTP '+r.status+' at '+route);return r.json();}
if(process.argv.includes('--stop')){
  const state=await get('/api/state');if(state.busy)throw new Error('Engine is busy.');
  const id=state.project?.id,revision=state.project?.revision;
  const saved={id,revision,preview:state.previewUrl,before:id&&revision?fingerprint(id,revision):null};
  await fs.writeFile(checkpoint,JSON.stringify(saved,null,2)+'\n');await post('/api/shutdown');console.log('Engine stopped; saved project checkpoint retained.');
}else if(process.argv.includes('--restore')){
  const saved=JSON.parse(await fs.readFile(checkpoint,'utf8'));
  if(saved.before)assert.deepEqual(fingerprint(saved.id,saved.revision),saved.before);
  const state=saved.before?await post('/api/projects/open',{id:saved.id,version:saved.revision}):await get('/api/state');
  if(saved.before)assert.deepEqual(fingerprint(saved.id,saved.revision),saved.before);
  const knowledge=await get('/api/knowledge');assert.equal(knowledge.sources.length,53);assert.equal(knowledge.connection?.ok,true);
  if(state.previewUrl)assert.equal((await fetch(state.previewUrl)).status,200);
  const report={at:new Date().toISOString(),knowledgeSources:knowledge.sources.length,knowledgeMode:knowledge.mode,connectionVerified:knowledge.connection.ok,preview:state.previewUrl,sourceAndDataPreserved:!!saved.before,noNewGenerationJobs:!!saved.before,cachedBuild:state.preparation?.cached??null};
  await fs.writeFile(path.join(root,'validation','design-v4','activation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}else throw new Error('Use --stop or --restore.');
