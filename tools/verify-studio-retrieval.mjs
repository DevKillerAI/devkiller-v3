// Six live AnythingLLM searches; generation transport is simulated, never billed.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {AnythingLLMKnowledge} from '../modules/anythingllm-knowledge.mjs';
import {contextPayload} from '../modules/knowledge.mjs';
import {generateApp,generationContract} from '../modules/openai.mjs';
import {tokenCount} from '../modules/knowledge-embeddings.mjs';
const directory=await fs.mkdtemp(path.join(os.tmpdir(),'dk-design-retrieval-'));
const k=new AnythingLLMKnowledge(directory),results=[];
try{
  await k.initialize();await k.setMode('anythingllm');
  const cases=[
 ['S01','Which supported React Studio libraries and imports should I use for this app?'],
 ['S02','Create a polished accessible Radix dialog and themed category select with keyboard navigation, focus and Escape.'],
 ['S03','Create an animated workspace with Motion, reduced motion preferences, SVG and canvas zoom transforms.'],
 ['S04','Build a multi-screen app with HashRouter navigation, deep-route reload, back and shared state.'],
 ['DK12','Como evitar e diagnosticar erros de código, persistência, testes QA e seletores com texto exato?'],
 ['S05','Prevent and diagnose integration errors: unsupported imports, portal styling, routing context, save races and exact leaf text QA selectors.'],
 ['S06','Design distinct semantic graphics: chairs and tables must have different silhouettes, not the same SVG with different colors.'],
 ['S07','No desktop aparecem faixas brancas de controles mobile. display contents não oculta botões. Como prevenir?']
 ];
  for(const [expected,prompt] of cases){
    const context=await k.retrieve({query:prompt,stack:'react-v3'});
    await k.validateContext(context,'react-v3');
    const refs=context.chunks.map(c=>c.id);assert.ok(context.tokens<=4000&&refs.length<=6);
    let captured;
    await generateApp({prompt,stack:'react-v3',knowledgeContext:context,apiKey:'sk-transport-test-not-a-real-key',fetchImpl:async(_,options)=>{
      captured=JSON.parse(options.body);
      const result={title:'Fixture',summary:'Transport only',limitations:[],scenarios:[],files:[{name:'src/App.jsx',content:'export default function App(){return <h1>Fixture</h1>}'},{name:'src/styles.css',content:'body{margin:0}'}]};
      return new Response('data: '+JSON.stringify({type:'response.completed',response:{output:[{content:[{type:'output_text',text:JSON.stringify(result)}]}]}})+'\n\n');
    }});
    assert.deepEqual(JSON.parse(captured.input).knowledge,JSON.parse(contextPayload(context)));
    assert.ok(captured.instructions.includes('content-v1')&&captured.instructions.includes('design-v5'));
    const row={expected,retrieved:refs,found:refs.includes(expected),tokens:context.tokens,matchedModelInput:true};results.push(row);console.log(JSON.stringify(row));
  }
  const report={at:new Date().toISOString(),documents:k.status().sources.length,results,contractTokens:tokenCount(generationContract('react-v3')),generationCalls:0,transport:'simulated',retrieval:'real AnythingLLM',visualQualityProven:false};
  await fs.mkdir(new URL('../validation/studio-v1/',import.meta.url),{recursive:true});
  await fs.writeFile(new URL('../validation/studio-v1/retrieval.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  assert.ok(results.every(r=>r.found),'Relevant new references missing; see retrieval.json');
}finally{k.close();}
