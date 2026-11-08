import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {tasteForStage,tasteStatus} from '../modules/taste.mjs';
import {planProduct,planCacheKey} from '../modules/product-plan.mjs';
import {generateModular} from '../modules/modular-generation.mjs';
import {getEncoding} from 'js-tiktoken';

test('reviewed guidance stays compact, pinned and reversible for every stage',async()=>{
 const encoder=getEncoding('o200k_base');
 for(const stage of tasteStatus().stages){
  const on=tasteForStage(stage,'auto'),off=tasteForStage(stage,'off');
  assert.ok(encoder.encode(on.instructions).length<650);
  assert.equal(off.instructions,'');assert.equal(off.receipt.enabled,false);
  assert.notEqual(on.receipt.instructionHash,off.receipt.instructionHash);
  assert.equal(on.receipt.extraModelCalls,0);
 }
 const bytes=await fs.readFile(new URL('../knowledge/vendor/taste/upstream-skill.md',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),tasteStatus().sourceHash);
 assert.throws(()=>tasteForStage('planning','anything'));assert.throws(()=>tasteForStage('repair'));
});
test('planning A/B carries guidance alongside references and isolates caches without extra calls',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'taste-plan-'));const captured=[];
 const base={cacheFolder:path.join(root,'cache'),prompt:'Create a laboratory sample tracking workspace',stack:'vue-studio-v1',model:'fixture',apiKey:'fixture',knowledgeContext:{chunks:[{id:'ref',title:'Specimen handling',content:'Preserve chain of custody.',source:'https://example.test',hash:'x'}]},fetchImpl:async(_,o)=>{
  captured.push(JSON.parse(o.body));return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({requirements:[{id:'R01',requirement:'Track sample'}]})}]}]});
 }};
 try{
  for(const mode of ['off','auto']){const result=await planProduct({...base,tasteMode:mode,folder:path.join(root,mode)});assert.equal(result.taste.mode,mode);}
  assert.equal(captured.length,2);assert.ok(!captured[0].instructions.includes('TASTE ADAPTER'));assert.match(captured[1].instructions,/TASTE ADAPTER/);
  assert.match(captured[1].input,/Preserve chain of custody/);assert.equal(JSON.parse(captured[1].input).stack,base.stack);
  assert.notEqual(planCacheKey({...base,tasteMode:'off'}),planCacheKey({...base,tasteMode:'auto'}));
  await planProduct({...base,tasteMode:'auto',folder:path.join(root,'cached')});assert.equal(captured.length,2);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('modular generation uses each stage once and refuses to mix modes when resuming',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'taste-stages-'));const bodies=[];
 const replies=[[{name:'src/domain/rules.js',content:'export const maxSamples=3;'}],[{name:'src/App.jsx',content:'export default function App(){return <h1>Samples</h1>}'},{name:'src/styles.css',content:'body{color:black}'}],[{name:'src/requirement-map.json',content:'[]'}]];
 const opts={folder,prompt:'Manage laboratory specimens',stack:'react-v4',model:'gpt-5.6-luna',apiKey:'sk-fixture-not-a-real-key',tasteMode:'auto',fetchImpl:async(_,o)=>{
  const files=replies[bodies.length];bodies.push(JSON.parse(o.body));return new Response('data: '+JSON.stringify({type:'response.completed',response:{output:[{content:[{type:'output_text',text:JSON.stringify({title:'Lab',summary:'Lab',limitations:[],scenarios:[],files})}]}]}})+'\n\n');
 }};
 try{
  await generateModular(opts);assert.equal(bodies.length,3);
  for(const [i,label] of ['TOKEN HANDOFF ONLY','VISUAL IMPLEMENTATION','CONSISTENCY PASS'].entries())assert.ok(bodies[i].instructions.includes(label));
  await generateModular(opts);assert.equal(bodies.length,3);
  await assert.rejects(generateModular({...opts,tasteMode:'off'}),/different request/);assert.equal(bodies.length,3);
 }finally{await fs.rm(folder,{recursive:true,force:true});}
});

