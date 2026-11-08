import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateApp,repairApp} from '../modules/openai.mjs';
import {CONTENT_POLICY} from '../modules/content-policy.mjs';
import {DESIGN_BRIEF} from '../modules/design.mjs';

for(const stack of ['static-v1','react-v1','react-v2','react-v3'])test(`${stack}: incomplete request and mandatory policy reach generation and repair without extra calls`,async()=>{
  const files=stack==='static-v1'?[{name:'index.html',content:'<h1>Solstice</h1><p>To be defined</p>'}]:[{name:'src/App.jsx',content:'export default function App(){return <><h1>Solstice</h1><p>To be defined</p></>}'},{name:'src/styles.css',content:'body{margin:0}'}];
  const output={title:'Solstice',summary:'Venue and date can be filled in later.',limitations:['Venue and date: To be defined.'],files,scenarios:[]};
  const calls=[];
  const options={stack,apiKey:'sk-unit-fixture-not-a-real-key',fetchImpl:async(url,o)=>{
    calls.push(JSON.parse(o.body));assert.equal(url,'https://api.openai.com/v1/responses');
    return new Response('data: '+JSON.stringify({type:'response.completed',response:{output:[{content:[{type:'output_text',text:JSON.stringify(output)}]}]}})+'\n\n');
  }};
  const prompt='Create a website for my event Solstice.';
  const result=await generateApp({...options,prompt,knowledgeContext:{mode:'off',chunks:[]}});
  assert.equal(result.title,'Solstice');assert.deepEqual(result.limitations,output.limitations);
  assert.equal(calls.length,1);assert.equal(calls[0].input,prompt);assert.equal(Object.hasOwn(calls[0],"max_output_tokens"),false);
  assert.ok(calls[0].instructions.includes(CONTENT_POLICY));assert.ok(calls[0].instructions.includes(DESIGN_BRIEF));
  await repairApp({...options,files,originalPrompt:prompt,diagnostics:[{category:'funcional',status:'failed',check:'save',observed:'Save failed'}]});
  assert.equal(calls.length,2);assert.equal(JSON.parse(calls[1].input).original_request,prompt);
  assert.ok(calls[1].instructions.includes(CONTENT_POLICY));assert.ok(calls[1].instructions.includes(DESIGN_BRIEF));
});
