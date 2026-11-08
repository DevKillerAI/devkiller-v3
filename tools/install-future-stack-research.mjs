// Explicit research ingestion. Never modifies generator manifests or dependencies.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {anythingLLMVault} from './anythingllm-connect/server.mjs';
const root=new URL('../',import.meta.url);
const batch=new URL('../../planning/future-stacks/',import.meta.url);
const journalFile=new URL('.runtime/future-stacks-import.json',root);
const hash=text=>createHash('sha256').update(text).digest('hex');
const docs=await Promise.all(['F01','F02','F03','F04','F05'].map(async id=>{
  const content=await fs.readFile(new URL(id+'.md',batch),'utf8');
  return {id,content,title:content.split('\n')[0].replace(/^# /,''),hash:hash(content)};
}));
if(!process.argv.includes('--install')){console.log(JSON.stringify({mode:'research-only',documents:docs.map(({content,...d})=>d)}));process.exit(0);}
const key=await anythingLLMVault().load();
if(!key)throw new Error('AnythingLLM key unavailable');
async function api(route,body){
  const response=await fetch('http://127.0.0.1:3001/api/v1'+route,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+key,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000),redirect:'error'});
  if(!response.ok){await response.body?.cancel();throw new Error('AnythingLLM HTTP '+response.status+' '+route);}
  return response.json();
}
await fs.mkdir(new URL('.runtime/',root),{recursive:true});
const journal=await fs.readFile(journalFile,'utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return {documents:{}};});
const persist=()=>fs.writeFile(journalFile,JSON.stringify(journal,null,2));
const name='devkiller-future-stacks';
const list=await api('/workspaces');
let workspace=list.workspaces.find(w=>w.name===name);
if(!workspace){
  if(journal.creationStarted)throw new Error('Uncertain workspace creation: reconcile before retry');
  journal.creationStarted=true;await persist();
  workspace=(await api('/workspace/new',{name,chatMode:'query',openAiPrompt:'Research library only. These proposed technologies are not enabled in DevKiller. Distinguish proposals from supported runtime capabilities.'})).workspace;
}
if(!workspace?.slug||workspace.slug==='devkiller-biblioteca')throw new Error('Invalid research workspace');
journal.slug=workspace.slug;await persist();
const route='/workspace/'+encodeURIComponent(workspace.slug);
const inventory=async()=>{const r=await api(route);return r.workspace[0].documents;};
const productionBefore=(await api('/workspace/devkiller-biblioteca')).workspace[0].documents.map(d=>d.docpath).sort();
for(const d of docs){
  let record=journal.documents[d.id];
  if(record&&record.hash!==d.hash)throw new Error('Research content changed: '+d.id);
  if(!record){
    record=journal.documents[d.id]={hash:d.hash,state:'upload-started'};await persist();
    const r=await api('/document/raw-text',{textContent:d.content,metadata:{title:d.title+'.md',docAuthor:'DevKiller research',description:'Future stack research only; not supported by current generator',docSource:d.id+' SHA256 '+d.hash}});
    if(!r.success||!r.documents?.[0]?.location)throw new Error('Upload not confirmed: '+d.id);
    record.location=r.documents[0].location;record.state='uploaded';await persist();
  }
  if(!record.location)throw new Error('Uncertain upload: '+d.id);
  if(!(await inventory()).some(item=>item.docpath===record.location)){
    if(record.state==='index-started')throw new Error('Uncertain indexing: '+d.id);
    record.state='index-started';await persist();
    const r=await api(route+'/update-embeddings',{adds:[record.location],deletes:[]});
    if(r.error)throw new Error('Indexing failed: '+d.id);
  }
  if(!(await inventory()).some(item=>item.docpath===record.location))throw new Error('Missing indexed document: '+d.id);
  record.state='indexed';await persist();console.log(JSON.stringify({id:d.id,status:'indexed'}));
}
const results=[];
for(const d of docs){
  const r=await api(route+'/vector-search',{query:d.title,topN:5,scoreThreshold:0});
  const found=r.results?.some(hit=>JSON.stringify(hit).includes(d.title));
  results.push({id:d.id,query:d.title,found:Boolean(found)});
}
const productionAfter=(await api('/workspace/devkiller-biblioteca')).workspace[0].documents.map(d=>d.docpath).sort();
const report={checkedAt:new Date().toISOString(),workspace:workspace.slug,indexedDocuments:(await inventory()).length,productionUnchanged:JSON.stringify(productionBefore)===JSON.stringify(productionAfter),productionDocuments:productionAfter.length,results};
await fs.mkdir(new URL('validation/',root),{recursive:true});
await fs.writeFile(new URL('validation/future-stacks-ingestion.json',root),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
if(!report.productionUnchanged||results.some(r=>!r.found))process.exitCode=1;
