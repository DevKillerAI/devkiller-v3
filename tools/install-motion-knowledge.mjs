// Explicit maintenance command: node tools/install-motion-knowledge.mjs --install
// Adds only this curated batch; never deletes documents or changes the provider/model.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {digest} from '../modules/knowledge.mjs';
import {tokenCount} from '../modules/knowledge-embeddings.mjs';
import {anythingLLMVault} from './anythingllm-connect/server.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const batch=path.join(root,'knowledge','motion-v1');
const journalPath=path.join(root,'.runtime','motion-v1-import.json');
const manifestPath=path.join(root,'knowledge','anythingllm.json');
const corpusPath=path.join(root,'knowledge','recipes.json');
const ids=(await fs.readdir(batch)).filter(file=>/^M\d{2}\.md$/.test(file)).map(file=>file.slice(0,3)).sort();
const entries=await Promise.all(ids.map(async id=>{
  const content=await fs.readFile(path.join(batch,id+'.md'),'utf8');
  const title=content.split('\n')[0].replace(/^# /,'');
  const stacks=id==='M01'||id==='M05'?['react-v5','next-v1']:['react-v5','vue-v1','angular-v1','next-v1'];
  if(tokenCount(title+'\n'+title+'\n'+content)>1800)throw new Error('Recipe exceeds local per-document budget: '+id);
  return {id,title,content,hash:digest(content),stacks};
}));
if(!process.argv.includes('--install')){
  console.log(JSON.stringify({mode:'validate-only',documents:entries.map(({content,...e})=>({...e,tokens:tokenCount(content)}))},null,2));
}else{
  const state=await (await fetch('http://127.0.0.1:4310/api/state')).json();
  if(state.busy)throw new Error('Wait for the current Engine operation before installing references.');
  await fs.mkdir(path.dirname(journalPath),{recursive:true});
  const journal=await fs.readFile(journalPath,'utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return {documents:{}};});
  const persist=()=>fs.writeFile(journalPath,JSON.stringify(journal,null,2)+'\n');
  const key=await anythingLLMVault().load();if(!key)throw new Error('AnythingLLM key is not configured.');
  async function api(route,body){
    const response=await fetch('http://127.0.0.1:3001/api/v1'+route,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+key,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(60000)});
    if(!response.ok){await response.body?.cancel();throw new Error('AnythingLLM HTTP '+response.status+' at '+route);}
    return response.json();
  }
  const inventory=async()=>{const r=await api('/workspace/devkiller-biblioteca');return (Array.isArray(r.workspace)?r.workspace[0]:r.workspace).documents;};
  await inventory();
  for(const e of entries){
    let record=journal.documents[e.id];
    if(record&&record.hash!==e.hash)throw new Error('Content changed after import checkpoint: '+e.id);
    if(!record){
      record=journal.documents[e.id]={hash:e.hash,state:'upload-started'};await persist();
      const r=await api('/document/raw-text',{textContent:e.content,metadata:{title:e.title+'.md',docAuthor:'DevKiller curated guidance',description:'Curated Motion and visual engineering playbooks; official primary sources; 2026-09-23',docSource:'DevKiller '+e.id+' SHA256 '+e.hash,chunkSource:e.id}});
      if(!r.success||!r.documents?.[0]?.location)throw new Error('Upload not confirmed: '+e.id);
      record.location=r.documents[0].location;record.state='uploaded';await persist();
    }
    if(!record.location)throw new Error('Uncertain upload; reconcile before retrying: '+e.id);
    if(!(await inventory()).some(d=>d.docpath===record.location)){
      if(record.state==='index-started')throw new Error('Uncertain indexing; reconcile before retrying: '+e.id);
      record.state='index-started';await persist();
      const result=await api('/workspace/devkiller-biblioteca/update-embeddings',{adds:[record.location],deletes:[]});
      if(result.error)throw new Error('Indexing failed: '+e.id);
    }
    if(!(await inventory()).some(d=>d.docpath===record.location))throw new Error('Indexed document missing: '+e.id);
    record.state='indexed';await persist();console.log(JSON.stringify({id:e.id,status:record.state}));
  }
  // Commit local eligibility only after every reference is present in the live workspace.
  const manifest=JSON.parse(await fs.readFile(manifestPath,'utf8'));
  const corpus=JSON.parse(await fs.readFile(corpusPath,'utf8'));
  for(const e of entries){
    const registered=manifest.documents.find(d=>d.id===e.id);
    if(registered&&registered.hash!==e.hash)throw new Error('Refusing to replace an existing reference: '+e.id);
    if(!registered)manifest.documents.push({id:e.id,title:e.title,hash:e.hash,stacks:e.stacks,location:journal.documents[e.id].location,file:'motion-v1/'+e.id+'.md'});
    else registered.file='motion-v1/'+e.id+'.md';
    const recipe={id:'motion-v1-'+e.id.toLowerCase(),title:e.title,stacks:e.stacks,topics:e.title,content:e.content,source:'DevKiller motion-v1 / '+e.id+' / 2026-09-23'};
    const previous=corpus.documents.find(d=>d.id===recipe.id);
    if(previous&&previous.content!==recipe.content)throw new Error('Local recipe changed: '+e.id);
    if(previous)Object.assign(previous,{title:recipe.title,stacks:recipe.stacks,topics:recipe.topics,source:recipe.source});else corpus.documents.push(recipe);
  }
  for(const [target,value] of [[manifestPath,manifest],[corpusPath,corpus]]){
    const pending=target+'.pending';await fs.writeFile(pending,JSON.stringify(value,null,2)+'\n');await fs.rename(pending,target);
  }
  journal.completed=new Date().toISOString();await persist();
  console.log(JSON.stringify({installed:entries.length,anythingLLMDocuments:manifest.documents.length,localRecipes:corpus.documents.length,paidGenerationCalls:0}));
}
