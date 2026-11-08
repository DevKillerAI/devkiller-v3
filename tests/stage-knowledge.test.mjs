import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {StageKnowledge,STAGE_COLLECTIONS,stageContext} from '../modules/stage-knowledge.mjs';
import {contextPayload,digest} from '../modules/knowledge.mjs';
import {planProduct} from '../modules/product-plan.mjs';
import {generateModular} from '../modules/modular-generation.mjs';
import {repairInput} from '../modules/openai.mjs';

async function setup(t){
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'dk-stage-rag-'));let k;
 const state={calls:[],failGroup:null,removed:false};
 k=new StageKnowledge(folder,{loadKey:async()=> 'test-secret',fetchImpl:async(url,options)=>{
  state.calls.push(url);const slug=new URL(url).pathname.split('/')[4];
  const group=slug==='devkiller-biblioteca'?null:slug.replace('dk_','').toUpperCase();
  if(group===state.failGroup&&group)return Response.json({},{status:503});
  if(url.endsWith('/vector-search')){
   const docs=group?k.stageCatalog.documents.filter(d=>d.group===group):k.library.documents.filter(d=>['DK02','P09','M05','M06','M09'].includes(d.id));
   return Response.json({results:[...docs.slice(0,8).map(d=>({metadata:{chunkSource:d.id},text:`${group||'CORE'} ${d.id}: verified reference text for this stage.`,score:.9})),{metadata:{chunkSource:'unknown-external'},text:'Reject this',score:1}]});
  }
  const docs=group?k.stageCatalog.documents.filter(d=>d.group===group):k.library.documents;
  return Response.json({workspace:[{slug,documents:docs.filter((d,i)=>!(state.removed&&group&&i===0)).map(d=>({docpath:d.location}))}]});
 }});
 await k.initialize();t.after(async()=>{k.close();await fs.rm(folder,{recursive:true,force:true});});return {k,state,folder};
}
const opts={query:'Build an equipment reservation workspace with persistent inventory and a distinct design.',stack:'react-v4',mode:'anythingllm',stages:Object.keys(STAGE_COLLECTIONS)};
test('stage routing searches each collection once, isolates sources and respects per-call budget',async t=>{
 const {k,state}=await setup(t);const c=await k.retrieve(opts);assert.equal(c.routing.searchCalls,5);assert.deepEqual(c.routing.warnings,[]);
 for(const [stage,context] of Object.entries(c.stages)){
  assert.ok(context.tokens<=4000&&context.chunks.length<=6);
  assert.equal(context.hash,digest(contextPayload(context)));
  assert.ok(context.chunks.some(d=>d.group));
  assert.ok(context.chunks.every(d=>!d.group||STAGE_COLLECTIONS[stage].includes(d.group)));
  assert.ok(!context.chunks.some(d=>d.id==='unknown-external'));
 }
 assert.equal(state.calls.filter(u=>!u.includes('devkiller-biblioteca')&&u.endsWith('vector-search')).length,5);
 await k.validateContext(c,'react-v4');
});
test('3D and Motion recipes reach planning, feature implementation and visual review',async t=>{
 const {k}=await setup(t);const c=await k.retrieve({...opts,stack:'react-v5',query:'Create a premium Three.js React Three Fiber glass scene with environment reflections and purposeful Motion scroll animation.'});
 for(const stage of ['planning','foundation','features','visual-review'])assert.ok(c.stages[stage].chunks.some(d=>d.id==='M06'),stage+' lacks the glass implementation recipe');
 assert.ok(c.stages.features.chunks.some(d=>d.id==='M05'));
 assert.ok(c.stages['visual-review'].chunks.some(d=>d.id==='M09'));
});
test('off does not access the vault or networks and legacy contexts remain valid',async t=>{
 const {k,state}=await setup(t);const c=await k.retrieve({...opts,mode:'off'});assert.equal(c.stages,undefined);assert.equal(state.calls.length,0);
 const legacy=await k.retrieve({...opts,stages:[]});await k.validateContext(legacy,'react-v4');assert.equal(stageContext(legacy,'planning'),legacy);
});
test('specialist failure explicitly degrades without retries or invalidating core connection',async t=>{
 const {k,state}=await setup(t);state.failGroup='DESIGN_INTELLIGENCE';const c=await k.retrieve(opts);
 assert.equal(c.routing.warnings.length,1);assert.equal(c.stages.planning.specialistReferences,0);assert.ok(c.stages.planning.chunks.length);assert.equal(k.connection.ok,true);
 assert.equal(state.calls.filter(u=>u.includes('dk_design_intelligence')).length,1);await k.validateContext(c,'react-v4');
});
test('tampering, wrong-stage sources and removed documents invalidate saved references',async t=>{
 const {k,state}=await setup(t);const c=await k.retrieve(opts);
 const changed=structuredClone(c);changed.stages.planning.chunks[0].content+='bad';await assert.rejects(k.validateContext(changed,'react-v4'),/RAG|knowledge|reference/i);
 const wrong=structuredClone(c);const s=wrong.stages.planning;s.chunks.push(c.stages.integration.chunks.find(d=>d.group==='SECURITY_ACCESSIBILITY'));s.hash=digest(contextPayload(s));await assert.rejects(k.validateContext(wrong,'react-v4'),/source/);
 state.removed=true;await assert.rejects(k.validateContext(c,'react-v4'),/removed/);
});
test('planning receives retrieved text as data and changing knowledge invalidates plan cache',async t=>{
 const {k,folder}=await setup(t);const bundle=await k.retrieve(opts);const knowledgeContext=stageContext(bundle,'planning');let calls=0;
 const args={cacheFolder:path.join(folder,'cache'),prompt:'A repair workshop',stack:'react-v4',model:'fixture',apiKey:'fixture',knowledgeContext,fetchImpl:async(_,o)=>{
  calls++;const b=JSON.parse(o.body);assert.deepEqual(JSON.parse(b.input).knowledge,JSON.parse(contextPayload(knowledgeContext)));assert.ok(!b.instructions.includes(knowledgeContext.chunks[0].content));
  return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({requirements:[{id:'R01',requirement:'Save'}]})}]}]});
 }};
 await planProduct({...args,folder:path.join(folder,'one')});await planProduct({...args,folder:path.join(folder,'two')});assert.equal(calls,1);
 knowledgeContext.chunks[0].content+=' updated';knowledgeContext.hash=digest(contextPayload(knowledgeContext));await planProduct({...args,folder:path.join(folder,'three')});assert.equal(calls,2);
});
test('all code stages and repair receive their own saved references, receipts prevent repeat calls',async t=>{
 const {k,folder}=await setup(t);const bundle=await k.retrieve(opts);let calls=0;
 const names=['foundation','features','integration'];
 const args={folder:path.join(folder,'modules'),prompt:opts.query,stack:opts.stack,model:'gpt-5.6-luna',apiKey:'sk-test-placeholder-not-real',knowledgeContext:bundle,fetchImpl:async(_,o)=>{
  const stage=names[calls++];const b=JSON.parse(o.body);const data=JSON.parse(b.input[0].content[0].text);assert.deepEqual(data.knowledge,bundle.stages[stage].chunks);
  const files=stage==='foundation'?[{name:'src/domain/rules.js',content:'export const value=1;'}]:stage==='features'?[{name:'src/App.jsx',content:'export default function App(){return <h1>Workshop</h1>}'},{name:'src/styles.css',content:'body{}'}]:[{name:'src/requirement-map.json',content:'[]'}];
  const app={title:'Workshop',summary:'Fixture only',limitations:[],scenarios:[],files};
  return new Response('data: '+JSON.stringify({type:'response.completed',response:{output:[{content:[{type:'output_text',text:JSON.stringify(app)}]}]}})+'\n\n');
 }};
 await generateModular(args);await generateModular(args);assert.equal(calls,3);
 for(const stage of names){const receipt=JSON.parse(await fs.readFile(path.join(args.folder,stage+'.json'),'utf8'));assert.equal(receipt.knowledgeHash,bundle.stages[stage].hash);}
 const repair=JSON.parse(repairInput({files:[{name:'src/App.jsx',content:'export default function App(){return null;}'},{name:'src/styles.css',content:'body{}'}],diagnostics:[{category:'funcional',status:'failed',observed:'Save button does not persist data'}],originalPrompt:opts.query,stack:opts.stack,knowledgeContext:bundle}));
 assert.deepEqual(repair.knowledge,JSON.parse(contextPayload(bundle.stages.repair)));
});
