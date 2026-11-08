// Four fresh-project repair trials. Paid, explicit, no retries.
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {createServer} from './knowledge-server.mjs';
import {verifyGeneratedApp} from './rag-browser-verifier.mjs';
if(process.argv[2]!=='--run'||!process.argv[3])throw new Error('Use --run <study folder>.');
const folder=path.join(path.resolve(process.argv[3]),'clean-repairs');await fs.mkdir(folder,{recursive:true});
const manifest={startedAt:new Date().toISOString(),maxRepairs:4,purpose:'Corrected repair protocol: a fresh imported project before each trial; no inherited generation prompt. Earlier exploratory repairs retained, not substituted silently.'};await fs.writeFile(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2));
const server=await createServer({fixture:false,real:true}),browser=await chromium.launch({headless:true}),reports=[];
const save=async(name,data)=>fs.writeFile(path.join(folder,name+'.json'),JSON.stringify(data,null,2));
try{
  manifest.model=(await server.state()).openai.model;await save('manifest',manifest);
  await server.post('knowledge/rebuild');await server.ready();const knowledge=await(await fetch(server.origin+'/api/knowledge')).json();if(!knowledge.indexReady)throw new Error('Real semantic index required.');await save('index',knowledge);
  for(const fault of ['missing-variable','early-render'])for(const mode of fault==='missing-variable'?['off','hybrid']:['hybrid','off']){
    const name=`repair-${fault}-${mode}`,record={name,kind:'repair',case:fault,mode,model:manifest.model,startedAt:Date.now()};
    await server.post('projects/new');
    const html='<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Persistent counter</title><h1>Persistent counter</h1><button id="increment" disabled>Increment</button><button id="reset" disabled>Reset</button><output id="count">0</output><script src="/__devkiller/db.js"></script><script src="app.js" defer></script></html>';
    const js=`let count=0; const output=document.querySelector('#count'); ${fault==='missing-variable'?"output.textContent = missingInitial;":"render();"}
const render=()=>{output.textContent=String(count);};
async function save(next){await DevKillerDB.set('counter',next);count=next;render();}
DevKillerDB.get('counter').then(value=>{count=value??0;render();document.querySelector('#increment').disabled=false;document.querySelector('#reset').disabled=false;});
document.querySelector('#increment').onclick=()=>save(count+1);document.querySelector('#reset').onclick=()=>save(0);`;
    await server.post('start',{files:[{name:'index.html',content:html},{name:'app.js',content:js}],stack:'static-v1'});record.before=(await server.state()).qa;
    if(!record.before.some(q=>q.category==='funcional'&&q.status==='failed'))throw new Error('Fault did not reproduce.');
    console.log(name+': one repair in a fresh project');await server.post('repair',{knowledgeMode:mode});const final=await server.ready(300000);record.repair=final.repair;record.engineQA=final.qa;record.finishedAt=Date.now();
    if(final.repair.originalPromptAvailable)throw new Error('The clean repair inherited an unexpected prompt.');
    record.verification=final.repair.status==='completed'?await verifyGeneratedApp({browser,folder,kind:'repair',url:final.previewUrl,name}):{checks:[],passed:0,total:0,allPassed:false,error:final.repair.result};
    const filesUrl=final.repair.revision?`/api/source?project=${final.repair.projectId}&version=${final.repair.revision}`:'/api/current-files';await save(name+'-files',await(await fetch(server.origin+filesUrl)).json());reports.push(record);await save(name,record);await save('results',reports);console.log(`${name}: ${record.verification.passed}/${record.verification.total}`);
  }
}catch(error){await save('failure',{message:error.message});process.exitCode=1;}
finally{manifest.finishedAt=new Date().toISOString();await save('manifest',manifest);await save('results',reports);await save('knowledge',await(await fetch(server.origin+'/api/knowledge')).json());await browser.close();await server.cleanup();}
