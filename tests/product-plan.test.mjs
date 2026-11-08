import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {planProduct,assessRequirementMap} from '../modules/product-plan.mjs';
import {generateApp} from '../modules/openai.mjs';
const plan={requirements:[{id:'R01',requirement:'Save booking',screen:'Booking',acceptance:'Reload retains booking'}]};
test('planning receipt is reused and never silently repeated after uncertainty',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'dk-plan-'));let calls=0;
 const opts={folder,prompt:'Book a studio',stack:'react-v4',model:'fixture',apiKey:'not-a-key',fetchImpl:async()=>{calls++;return Response.json({status:'completed',usage:{input_tokens:1,output_tokens:2},output:[{content:[{type:'output_text',text:JSON.stringify(plan)}]}]});}};
 await planProduct(opts);await planProduct(opts);assert.equal(calls,1);
 await assert.rejects(planProduct({...opts,prompt:'Different request'}),/different/);
 const failed=await fs.mkdtemp(path.join(os.tmpdir(),'dk-plan-fail-'));let attempts=0;const bad={...opts,folder:failed,fetchImpl:async()=>{attempts++;throw Error('Lost connection')}};
 await assert.rejects(planProduct(bad),/Planning stopped/);await assert.rejects(planProduct(bad),/No automatic retry/);assert.equal(attempts,1);
});
test('coverage mapping checks existing source without claiming functional success',()=>{
 const files=[{name:'src/App.jsx',content:'example'},{name:'src/requirement-map.json',content:JSON.stringify([{id:'R01',files:['src/missing.jsx'],evidence:'claim'}])}];
 const result=assessRequirementMap(files,plan);assert.equal(result.requirements[0].sourceFilesExist,false);assert.match(result.basis,/behavior requires independent tests/);
});
test('plans reuse only for matching models and invalidate across models',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'dk-plan-cache-'));let calls=0;
 const opts={cacheFolder:path.join(root,'cache'),prompt:'Rent backpacks',stack:'react-v4',assets:[],apiKey:'fixture',fetchImpl:async()=>{calls++;return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(plan)}]}]});}};
 await planProduct({...opts,folder:path.join(root,'first'),model:'first-model'});
 const reused=await planProduct({...opts,folder:path.join(root,'second'),model:'first-model'});
 assert.equal(calls,1);assert.equal(reused.calls,0);assert.equal(reused.cachedFrom.model,'first-model');assert.equal(reused.usage,null);
 await planProduct({...opts,folder:path.join(root,'changed-model'),model:'second-model'});assert.equal(calls,2);
 await planProduct({...opts,folder:path.join(root,'changed'),model:'second-model',assets:[{url:'different-image'}]});assert.equal(calls,3);
});
test('independent plan reaches generation as data and survives the photo instructions',async()=>{
 let captured;
 await generateApp({prompt:'Build a complete rental workspace',stack:'react-v4',productPlan:plan,media:{assets:[{url:'/__devkiller/media/example.jpg',role:'context'}],images:[]},apiKey:'sk-fixture-only-not-a-real-key',fetchImpl:async(_,options)=>{
  captured=JSON.parse(options.body);
  const app={title:'Fixture',summary:'Transport only',limitations:[],scenarios:[],files:[{name:'src/App.jsx',content:'export default function App(){return <h1>Fixture</h1>}'},{name:'src/styles.css',content:'body{margin:0}'}]};
  return new Response('data: '+JSON.stringify({type:'response.completed',response:{output:[{content:[{type:'output_text',text:JSON.stringify(app)}]}]}})+'\n\n');
 }});
 assert.match(captured.input[0].content[0].text,/Reload retains booking/);
 assert.match(captured.instructions,/requirement-map.json/);
 assert.match(captured.instructions,/Approved visual assets/);
 assert.equal(captured.instructions.includes('Reload retains booking'),false);
 assert.equal(Object.hasOwn(captured,"max_output_tokens"),false);
});
