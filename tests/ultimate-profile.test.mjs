import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {generateModular} from '../modules/modular-generation.mjs';
import {MediaLibrary} from '../modules/media.mjs';
import {ProjectStore} from '../modules/projects.mjs';import {RunStore} from '../modules/orchestrator.mjs';
import {planProduct} from '../modules/product-plan.mjs';
import {generationProfile} from '../modules/generation-profile.mjs';
test('ultimate omits output cap, uses high reasoning and can continue beyond two partial responses',async t=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'dk-ultimate-'));t.after(()=>fs.rm(folder,{recursive:true,force:true}));let calls=0;
 const r=await generateModular({folder,prompt:'Build a complete hotel website with reservations.',stack:'react-v4',model:'gpt-5.6-sol',apiKey:'sk-fixture-only-not-real',generationProfile:'ultimate',fetchImpl:async(_,o)=>{
  const b=JSON.parse(o.body);assert.equal(Object.hasOwn(b,"max_output_tokens"),false);assert.equal(b.reasoning.effort,'high');assert.ok(!b.instructions.includes('Aim below'));assert.ok(!b.instructions.includes('12,000 characters'));calls++;
  if(calls<=3){const text='{"files":['+JSON.stringify({name:`src/data/part${calls}.js`,content:`export const n${calls}=${calls};`})+',{"name":"src/unfinished.js","content":"';return new Response('data: '+JSON.stringify({type:'response.output_text.delta',delta:text})+'\n\ndata: '+JSON.stringify({type:'response.incomplete',response:{usage:{output_tokens:10}}})+'\n\n');}
  const files=calls===4?[{name:'src/domain/complete.js',content:'export const complete=true;'}]:calls===5?[{name:'src/App.jsx',content:'export default function App(){return <h1>Hotel</h1>}'},{name:'src/styles.css',content:'body{}'}]:[{name:'src/requirement-map.json',content:'[]'}];
  const app={title:'Hotel',summary:'Fixture',limitations:[],scenarios:[],files};return new Response('data: '+JSON.stringify({type:'response.completed',response:{output:[{content:[{type:'output_text',text:JSON.stringify(app)}]}]}})+'\n\n');
 }});assert.equal(calls,6);assert.equal(r.files.length,7);
});
test('ultimate run has no old cumulative call cap while standard retains its cap',async t=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'dk-ultimate-run-'));t.after(()=>fs.rm(folder,{recursive:true,force:true}));const p=new ProjectStore(folder),project=p.create({prompt:'Hotel'}),store=new RunStore(p);
 store.create({id:'ultimate',projectId:project.id,modularGeneration:true,generationProfile:'ultimate'});let run=store.claim(project.id,'ultimate');for(let i=0;i<8;i++)run=store.reserve(run);assert.equal(run.calls,8);assert.equal(run.maxCalls,null);
 assert.throws(()=>generationProfile('unknown'),/Unknown/);
});
test('editorial images have separate receipts and assets, are reused and failures do not cascade',async t=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'dk-ultimate-images-'));t.after(()=>fs.rm(folder,{recursive:true,force:true}));let calls=0;
 const media=new MediaLibrary({file:()=>path.join(folder,'app.sqlite')},{fetchImpl:async(_,o)=>{calls++;const b=JSON.parse(o.body);assert.equal(b.model,'gpt-image-2.5-flare');assert.equal(b.quality,'high');assert.match(b.prompt,/Art direction:/);return Response.json({data:[{b64_json:Buffer.from([137,80,78,71,13,10,26,10,calls]).toString('base64')}]});}});
 const r=await media.generateEditorialSet('id','A coastal boutique hotel',{apiKey:'fixture',count:3});assert.equal(r.imageGeneration.status,'completed');assert.equal(r.assets.length,3);assert.equal(calls,3);await media.generateEditorialSet('id','A coastal boutique hotel',{apiKey:'fixture',count:3});assert.equal(calls,3);
 const failFolder=path.join(folder,'failed');let failed=0;const bad=new MediaLibrary({file:()=>path.join(failFolder,'app.sqlite')},{fetchImpl:async()=>{failed++;return Response.json({},{status:403});}});const result=await bad.generateEditorialSet('id','A coastal boutique hotel',{apiKey:'fixture',count:3});assert.equal(result.imageGeneration.status,'partial');assert.equal(failed,1);await bad.generateEditorialSet('id','A coastal boutique hotel',{apiKey:'fixture',count:3});assert.equal(failed,1);
});
test('ultimate planning omits output cap and retains high reasoning',async t=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'dk-ultimate-plan-'));t.after(()=>fs.rm(folder,{recursive:true,force:true}));
 await planProduct({folder,prompt:'A coastal boutique hotel',stack:'react-v4',model:'gpt-5.6-sol',apiKey:'fixture',generationProfile:'ultimate',fetchImpl:async(_,o)=>{const b=JSON.parse(o.body);assert.equal(Object.hasOwn(b,"max_output_tokens"),false);assert.equal(b.reasoning.effort,'high');return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({requirements:[{id:'R01'}]})}]}]});}});
});
