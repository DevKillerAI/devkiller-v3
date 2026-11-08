import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {AnythingLLMKnowledge} from '../modules/anythingllm-knowledge.mjs';
import {contextPayload,digest} from '../modules/knowledge.mjs';
import {generateApp,repairInput} from '../modules/openai.mjs';
import {RunStore,executeGeneration} from '../modules/orchestrator.mjs';
import {ProjectStore} from '../modules/projects.mjs';

const query='Crie uma cafeteria com cardápio e design premium sem emojis.';
async function setup(t){
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'dk-anythingllm-'));
  const state={calls:[],fail:false,removed:false,empty:false,oversized:false};let k;
  k=new AnythingLLMKnowledge(directory,{loadKey:async()=> 'fixture-private-key',fetchImpl:async(url,options)=>{
    state.calls.push({url,body:options.body});assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer fixture-private-key');
    if(state.fail)return Response.json({error:'fixture-private-key'},{status:401});
    if(url.endsWith('/vector-search'))return Response.json({results:state.empty?[]:[
      ...(state.recipe?[{metadata:{chunkSource:'D02'},text:'A truncated code fragment',score:.999}]:[]),
      {metadata:{chunkSource:'R01'},text:'Research must be excluded',score:.99},
      {metadata:{chunkSource:'DK01'},text:'React only imports',score:.97},
      ...Array.from({length:8},(_,i)=>({metadata:{chunkSource:i<2?'P09':'T0'+(i-1)},text:(state.oversized?'Large '.repeat(20000):'Design premium: tipografia, SVG, legibilidade. ')+i,score:.9-i*.02}))]});
    return Response.json({workspace:[{slug:'devkiller-biblioteca',documents:k.library.documents.filter(d=>!state.removed||d.id!=='P09').map(d=>({docpath:d.location}))}]});
  }});
  await k.initialize();t.after(async()=>{k.close();await fs.rm(directory,{recursive:true,force:true});});return {k,state,directory};
}
test('AnythingLLM activation checks inventory, persists mode and filters/deduplicates context',async t=>{
  const {k,state}=await setup(t);await k.setMode('anythingllm');assert.equal(k.status().sources.length,k.library.documents.length);
  const c=await k.retrieve({query,stack:'static-v1'});assert.equal(c.mode,'anythingllm');assert.ok(c.chunks.length>0&&c.chunks.length<=6);assert.ok(c.tokens<=4000);assert.equal(new Set(c.chunks.map(d=>d.id)).size,c.chunks.length);assert.ok(!c.chunks.some(d=>['R01','DK01'].includes(d.id)));assert.ok(state.calls.every(c=>c.url.includes('/devkiller-biblioteca')));assert.equal(c.hash,digest(contextPayload(c)));await k.validateContext(c,'static-v1');
  k.close();await k.initialize();assert.equal(k.status().mode,'anythingllm');assert.ok(!JSON.stringify(k.status()).includes('fixture-private-key'));
});
test('Off requires no AnythingLLM key or network and preserves original behavior',async t=>{const {k,state}=await setup(t);await k.setMode('off');const c=await k.retrieve({query,stack:'react-v2'});assert.equal(c.mode,'off');assert.equal(state.calls.length,0);});
test('short specific requests survive facet query construction',async t=>{const {k,state}=await setup(t);await k.setMode('anythingllm');const query='React Router navigation route reload';await k.retrieve({query,stack:'react-v3'});const searches=state.calls.filter(c=>c.url.endsWith('/vector-search'));assert.ok(searches.length>0&&searches.length<=4);assert.ok(searches.every(c=>JSON.parse(c.body).query.includes(query)));});
test('explicit mixed Three.js and GSAP requests retain their verified recipes when vector ranking misses them',async t=>{
  const {k}=await setup(t);await k.setMode('anythingllm');
  const c=await k.retrieve({query:'Create a premium Three.js and React Three Fiber glass scene with Motion interactions and GSAP choreography.',stack:'react-v5'});
  for(const id of ['M06','M07','M04','M05'])assert.ok(c.chunks.some(d=>d.id===id),`missing explicit recipe ${id}`);
  assert.ok(c.chunks.find(d=>d.id==='M06').methods.includes('explicit-topic-match'));
  assert.ok(c.chunks.length<=6&&c.tokens<=4000);await k.validateContext(c,'react-v5');
});
test('vector hit expands to the complete hash-verified recipe without bypassing stack or token limits',async t=>{
  const {k,state}=await setup(t);state.recipe=true;await k.setMode('anythingllm');
  const c=await k.retrieve({query:'themed dropdown filter',stack:'react-v2'});
  const recipe=c.chunks.find(d=>d.id==='D02');assert.ok(recipe);
  assert.equal(recipe.content,await fs.readFile(new URL('../knowledge/design-v4/D02.md',import.meta.url),'utf8'));
  assert.equal(recipe.hash,k.library.documents.find(d=>d.id==='D02').hash);
  assert.ok(recipe.methods.includes('verified-complete-recipe'));assert.ok(c.tokens<=4000&&c.chunks.length<=6);
  await k.validateContext(c,'react-v2');
  const staticContext=await k.retrieve({query:'themed dropdown filter',stack:'static-v1'});
  assert.ok(!staticContext.chunks.some(d=>d.id==='D02'));
});
test('failed activation retains previous mode; no raw error or key is exposed',async t=>{const {k,state}=await setup(t);state.fail=true;await assert.rejects(k.setMode('anythingllm'),e=>/RAG indisponível/.test(e.message)&&!e.message.includes('fixture-private-key'));assert.equal(k.status().mode,'off');assert.equal(state.calls.length,1);});
test('unavailable, empty, oversized or incomplete library never silently bypasses selected RAG',async t=>{for(const flag of ['fail','empty','oversized','removed']){const {k,state}=await setup(t);await k.setMode('anythingllm');state[flag]=true;await assert.rejects(k.retrieve({query,stack:'static-v1'}),/RAG/);assert.equal(k.status().mode,'anythingllm');}});
test('disabled, revoked or tampered sources invalidate saved context before generation',async t=>{const {k,state}=await setup(t);await k.setMode('anythingllm');const c=await k.retrieve({query,stack:'react-v2'});const altered=structuredClone(c);altered.chunks[0].content+='tampered';await assert.rejects(k.validateContext(altered,'react-v2'),/RAG/);k.setSource('P09',false);await assert.rejects(k.validateContext(c,'react-v2'),/desativada/);k.setSource('P09',true);state.removed=true;await assert.rejects(k.validateContext(c,'react-v2'),/removida/);});
test('saved real-shaped retrieval reaches model input on resume once, with fixed icon preference and repair context',async t=>{
  const {k,directory,state}=await setup(t);await k.setMode('anythingllm');
  const projects=new ProjectStore(path.join(directory,'projects')),p=projects.create({prompt:query}),store=new RunStore(projects),job={id:'rag-proof',projectId:p.id,prompt:query,stack:'static-v1',model:'gpt-5.6-luna',knowledgeMode:'anythingllm'};store.create(job);
  let searches=0,calls=0,body,interrupt=true;const checkpoint=store.checkpoint.bind(store);
  store.checkpoint=(run,type,patch)=>{const saved=checkpoint(run,type,patch);if(type==='knowledge.saved'&&interrupt){interrupt=false;throw new Error('Fixture interruption');}return saved;};
  const args={store,projectId:p.id,id:job.id,checkEnvironment:async()=>{},prepareContext:async()=>{searches++;return k.retrieve({query,stack:job.stack});},validateContext:c=>k.validateContext(c,job.stack),generate:async(j,c)=>generateApp({apiKey:'sk-fixture-placeholder-not-real',model:job.model,prompt:query,stack:job.stack,knowledgeContext:c,fetchImpl:async(_,options)=>{calls++;body=JSON.parse(options.body);const output={title:'Fixture',summary:'Fixture',limitations:[],scenarios:[],files:[{name:'index.html',content:'<h1>Fixture</h1>'}]};return new Response('data: '+JSON.stringify({type:'response.completed',response:{output:[{content:[{type:'output_text',text:JSON.stringify(output)}]}]}})+'\n\n');}}),saveVersion:async()=>1,deploy:async()=>({})};
  await assert.rejects(executeGeneration(args),/interruption/);assert.equal(calls,0);await executeGeneration(args);assert.equal(searches,1);assert.equal(calls,1);
  const context=store.get(p.id,job.id).knowledgeContext;assert.deepEqual(JSON.parse(body.input).knowledge.references,JSON.parse(contextPayload(context)).references);assert.ok(body.instructions.includes('Não use emojis'));assert.ok(!body.instructions.includes(context.chunks[0].content));assert.equal(state.calls.filter(c=>c.url.endsWith('vector-search')).length,context.usage.retrievalCalls);
  assert.ok(JSON.parse(repairInput({files:[{name:'index.html',content:'<h1>Fixture</h1>'}],diagnostics:[{category:'funcional',status:'failed',observed:'Missing handler'}],originalPrompt:query,knowledgeContext:context})).knowledge.references.length);
});
test('retrieval outage reserves no model call allowance',async t=>{const {k,directory,state}=await setup(t);await k.setMode('anythingllm');state.fail=true;const projects=new ProjectStore(path.join(directory,'projects')),p=projects.create({prompt:query}),store=new RunStore(projects),job={id:'unavailable',projectId:p.id,prompt:query,stack:'react-v2'};store.create(job);await assert.rejects(executeGeneration({store,projectId:p.id,id:job.id,checkEnvironment:async()=>{},prepareContext:()=>k.retrieve({query,stack:job.stack}),generate:async()=>assert.fail('No model call allowed')}),/RAG indisponível/);assert.equal(store.get(p.id,job.id).calls,0);});


