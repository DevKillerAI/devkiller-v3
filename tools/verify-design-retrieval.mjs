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
    ['D07','Crie um site para o meu evento Horizonte. Não tenho data, endereço nem descrição ainda; quero preencher e salvar depois.'],
    ['D01','Build a site for my event Solstice; I have not decided the venue, date or description. Let me fill in and save those details later.'],
    ['D02','Build a modern festival site with themed genre filters, dropdown options and mobile navigation menus.'],
    ['D03','Build responsive artist cards with long stage and genre labels and add buttons. Prevent text and button overlap.'],
    ['D04','Create an expressive editorial hero with original dimensional SVG ribbon artwork, strong composition and depth.'],
    ['D05','Create a modern dashboard with coherent Lucide SVG icons and accessible icon-only action buttons, no emojis.'],
    ['D06','Create a finance dashboard with Recharts charts, themed tooltips, accurate totals and empty data states.']
  ];
  for(const [expected,prompt] of cases){
    const context=await k.retrieve({query:prompt,stack:'react-v2'});
    await k.validateContext(context,'react-v2');
    const refs=context.chunks.map(c=>c.id);assert.ok(context.tokens<=4000&&refs.length<=6);
    let captured;
    await generateApp({prompt,stack:'react-v2',knowledgeContext:context,apiKey:'sk-transport-test-not-a-real-key',fetchImpl:async(_,options)=>{
      captured=JSON.parse(options.body);
      const result={title:'Fixture',summary:'Transport only',limitations:[],scenarios:[],files:[{name:'src/App.jsx',content:'export default function App(){return <h1>Fixture</h1>}'},{name:'src/styles.css',content:'body{margin:0}'}]};
      return new Response('data: '+JSON.stringify({type:'response.completed',response:{output:[{content:[{type:'output_text',text:JSON.stringify(result)}]}]}})+'\n\n');
    }});
    assert.deepEqual(JSON.parse(captured.input).knowledge,JSON.parse(contextPayload(context)));
    assert.ok(captured.instructions.includes('content-v1')&&captured.instructions.includes('design-v4'));
    const row={expected,retrieved:refs,found:refs.includes(expected),tokens:context.tokens,matchedModelInput:true};results.push(row);console.log(JSON.stringify(row));
  }
  const report={at:new Date().toISOString(),documents:k.status().sources.length,results,contractTokens:tokenCount(generationContract('react-v2')),generationCalls:0,transport:'simulated',retrieval:'real AnythingLLM',visualQualityProven:false};
  await fs.mkdir(new URL('../validation/design-v4/',import.meta.url),{recursive:true});
  await fs.writeFile(new URL('../validation/design-v4/retrieval.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  assert.ok(results.every(r=>r.found),'Relevant new references missing; see retrieval.json');
}finally{k.close();}
