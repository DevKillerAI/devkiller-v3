// Live local retrieval + production orchestration/request builder; OpenAI transport is simulated.
// No app is generated with a paid model and no existing project is modified.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {AnythingLLMKnowledge} from '../modules/anythingllm-knowledge.mjs';
import {generateApp} from '../modules/openai.mjs';
import {contextPayload} from '../modules/knowledge.mjs';
import {ProjectStore} from '../modules/projects.mjs';
import {RunStore,executeGeneration} from '../modules/orchestrator.mjs';
const directory=await fs.mkdtemp(path.join(os.tmpdir(),'devkiller-live-rag-'));
const knowledge=new AnythingLLMKnowledge(path.join(directory,'knowledge'));
try {
  await knowledge.initialize();await knowledge.setMode('anythingllm');
  const prompt='Crie um app de cafeteria com cardápio, carrinho, variantes e totais em centavos. Design premium com ícones SVG, sem emojis. Salve pedidos sem sobrescrever dados ao carregar.';
  const projectStore=new ProjectStore(path.join(directory,'projects')),project=projectStore.create({prompt}),store=new RunStore(projectStore);
  const job={id:'live-rag-transport-proof',projectId:project.id,prompt,stack:'react-v2',model:'gpt-5.6-luna',knowledgeMode:'anythingllm'};store.create(job);
  let captured,calls=0;
  await executeGeneration({store,projectId:project.id,id:job.id,checkEnvironment:async()=>{},prepareContext:()=>knowledge.retrieve({query:prompt,stack:job.stack}),validateContext:c=>knowledge.validateContext(c,job.stack),generate:(j,c)=>generateApp({apiKey:'sk-test-fixture-not-a-real-key-00000000000000',model:job.model,prompt,stack:job.stack,knowledgeContext:c,fetchImpl:async(url,options)=>{
    assert.equal(url,'https://api.openai.com/v1/responses');captured=JSON.parse(options.body);calls++;
    const output={title:'Transport proof',summary:'Simulated output',limitations:['Not a generated app quality test'],scenarios:[],files:[{name:'src/App.jsx',content:'export default function App(){return <h1>Fixture</h1>}'},{name:'src/styles.css',content:'body{margin:0}'}]};
    return new Response('data: '+JSON.stringify({type:'response.completed',response:{output:[{content:[{type:'output_text',text:JSON.stringify(output)}]}]}})+'\n\n');
  }}),saveVersion:async()=>1,deploy:async()=>({})});
  const context=store.get(project.id,job.id).knowledgeContext;
  assert.ok(context.chunks.length);assert.equal(calls,1);assert.deepEqual(JSON.parse(captured.input).knowledge,JSON.parse(contextPayload(context)));assert.ok(captured.instructions.includes('Não use emojis'));assert.ok(context.chunks.every(c=>!captured.instructions.includes(c.content)));
  const report={checkedAt:new Date().toISOString(),status:'passed',workspace:knowledge.status().workspace,documents:knowledge.status().sources.length,mode:context.mode,model:captured.model,contextHash:context.hash,contextTokens:context.tokens,references:context.chunks.map(c=>({id:c.id,title:c.title,hash:c.hash,score:c.score})),savedBeforeModelCall:true,referencesMatchedModelInput:true,fixedNoEmojiPreference:true,realRetrieval:true,modelTransport:'simulated',paidModelCalls:0,generatedAppQualityTest:false};
  await fs.mkdir(new URL('../evidencias/rag/',import.meta.url),{recursive:true});await fs.writeFile(new URL('../evidencias/rag/anythingllm-activation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{knowledge.close();const resolved=path.resolve(directory);if(path.dirname(resolved)!==path.resolve(os.tmpdir())||!path.basename(resolved).startsWith('devkiller-live-rag-'))throw new Error('Unsafe cleanup');await fs.rm(resolved,{recursive:true,force:true});}
