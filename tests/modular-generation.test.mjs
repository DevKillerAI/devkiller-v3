import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {generateModular,recoverCompleteFiles} from '../modules/modular-generation.mjs';
const response=files=>({title:'Example',summary:'Example',limitations:[],files,scenarios:[]});
function stream(value){return new Response('data: '+JSON.stringify({type:'response.output_text.delta',delta:JSON.stringify(value)})+'\n\ndata: '+JSON.stringify({type:'response.completed',response:{usage:{input_tokens:10,output_tokens:20,total_tokens:30}}})+'\n\n');}
const config={apiKey:'sk-unit-test-placeholder-not-a-real-key',model:'gpt-5.6-luna',prompt:'Create a complete booking app',stack:'react-v4'};
test('partial recovery ignores truncated files and braces inside strings',()=>{
 const file={name:'src/domain/a.js',content:'export const x = {text: "}"};'};
 assert.deepEqual(recoverCompleteFiles('{"files":['+JSON.stringify(file)+',{"name":"src/b.js","content":"unfinished'),[file]);
 assert.deepEqual(recoverCompleteFiles('{"files":[{"name":"../bad.js","content":"x"}'),[]);
});
test('an output-limited stage continues only missing work within the bounded allowance',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'dk-continuation-'));let calls=0;
 try{const result=await generateModular({...config,folder,fetchImpl:async(_,options)=>{
  calls++;if(calls===1){const partial='{"files":['+JSON.stringify({name:'src/domain/a.js',content:'export const a=1;'})+',{"name":"src/incomplete.js","content":"oops';return new Response('data: '+JSON.stringify({type:'response.output_text.delta',delta:partial})+'\n\ndata: '+JSON.stringify({type:'response.incomplete',response:{usage:{input_tokens:10,output_tokens:8000,total_tokens:8010}}})+'\n\n');}
  if(calls===2){assert.match(JSON.stringify(JSON.parse(options.body).input),/src\/domain\/a.js/);return stream(response([{name:'src/lib/helper.js',content:'export const helper=1;'}]));}
  return stream(response(calls===3?[{name:'src/App.jsx',content:'export default function App(){return null;}'},{name:'src/styles.css',content:'body{}'}]:[{name:'src/requirement-map.json',content:'[]'}]));
 }});assert.equal(calls,4);assert.equal(result.usage.total,8100);assert.equal(result.files.some(f=>f.name==='src/incomplete.js'),false);}finally{await fs.rm(folder,{recursive:true,force:true});}
});
test('three bounded stages merge files, preserve source checkpoints and reuse receipts without calls',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'dk-modules-'));let calls=0,reserves=0;const checkpoints=[];
 const replies=[response([{name:'src/domain/rules.js',content:'export const price=2;'}]),response([{name:'src/App.jsx',content:'export default function App(){return <h1>Bookings</h1>}'},{name:'src/styles.css',content:'body{color:black}'}]),response([{name:'src/domain/rules.js',content:'export const price=3;'}])];
 const opts={...config,folder,reserve:()=>reserves++,checkpoint:d=>checkpoints.push(d),fetchImpl:async(_,options)=>{const body=JSON.parse(options.body);assert.equal(Object.hasOwn(body,"max_output_tokens"),false);if(calls)assert.match(JSON.stringify(body.input),/src\/domain\/rules.js/);return stream(replies[calls++]);}};
 try{const result=await generateModular(opts);assert.equal(calls,3);assert.equal(reserves,3);assert.equal(result.files.length,3);assert.equal(result.usage.total,90);assert.equal(await fs.readFile(path.join(folder,'source/src/domain/rules.js'),'utf8'),'export const price=3;');assert.equal(checkpoints.length,3);await generateModular({...opts,fetchImpl:()=>{throw Error('must not call')}});assert.equal(reserves,3);}finally{await fs.rm(folder,{recursive:true,force:true});}
});
test('failed stage preserves earlier files and never replays paid work on retry',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'dk-modules-'));let calls=0;
 const opts={...config,folder,fetchImpl:async()=>{calls++;if(calls===1)return stream(response([{name:'src/domain/rules.js',content:'export const rule=true;'}]));return new Response('data: '+JSON.stringify({type:'response.incomplete',response:{usage:{input_tokens:5,output_tokens:10,total_tokens:15}}})+'\n\n');}};
 try{await assert.rejects(generateModular(opts),e=>e.usage.total===45);assert.equal(calls,2);assert.match(await fs.readFile(path.join(folder,'source/src/domain/rules.js'),'utf8'),/rule=true/);await assert.rejects(generateModular(opts),/No call was repeated/);assert.equal(calls,2);}finally{await fs.rm(folder,{recursive:true,force:true});}
});
test('provider path traversal is rejected before any source is materialized',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'dk-modules-'));
 try{await assert.rejects(generateModular({...config,folder,fetchImpl:async()=>stream(response([{name:'src/../../escape.js',content:'bad'}]))}),/Invalid file/);}finally{await fs.rm(folder,{recursive:true,force:true});}
});
test('failed integration preserves a buildable feature candidate with an explicit limitation',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'dk-candidate-'));let calls=0;
 try{const result=await generateModular({...config,folder,inspectAssembly:async()=>({status:'passed'}),fetchImpl:async()=>{
  calls++;if(calls===1)return stream(response([{name:'src/domain/rules.js',content:'export const rule=true;'}]));
  if(calls===2)return stream(response([{name:'src/App.jsx',content:'export default function App(){return null;}'},{name:'src/styles.css',content:'body{}'}]));
  return new Response('data: '+JSON.stringify({type:'response.incomplete',response:{usage:{input_tokens:10,output_tokens:20,total_tokens:30}}})+'\n\n');
 }});assert.equal(calls,3);assert.equal(result.integrationIncomplete,true);assert.match(result.limitations.at(-1),/last buildable candidate/);assert.equal(result.usage.total,90);}finally{await fs.rm(folder,{recursive:true,force:true});}
});
test('partial foundation hands explicit pending work to the next stage without repeating it',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'dk-deferred-'));let calls=0;
 try{await generateModular({...config,folder,fetchImpl:async(_,options)=>{
  calls++;if(calls===1){const files=[1,2,3].map(n=>({name:`src/domain/rule${n}.js`,content:`export const rule=${n};`}));return new Response('data: '+JSON.stringify({type:'response.output_text.delta',delta:'{"files":['+files.map(f=>JSON.stringify(f)).join(',')+',{"name":"src/broken.js","content":"'})+'\n\ndata: '+JSON.stringify({type:'response.incomplete',response:{usage:{input_tokens:10,output_tokens:20,total_tokens:30}}})+'\n\n');}
  if(calls===2)assert.match(JSON.stringify(JSON.parse(options.body).input),/Foundation output was truncated/);
  return stream(response(calls===2?[{name:'src/App.jsx',content:'export default function App(){return null;}'},{name:'src/styles.css',content:'body{}'}]:[{name:'src/requirement-map.json',content:'[]'}]));
 }});assert.equal(calls,3);}finally{await fs.rm(folder,{recursive:true,force:true});}
});
