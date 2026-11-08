import test from 'node:test';
import assert from 'node:assert/strict';
import {createAppSpec,requirementReport} from '../modules/app-spec.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {generateModular} from '../modules/modular-generation.mjs';
const plan={requirements:[{id:'R01',requirement:'Save booking',acceptance:'Booking survives reload',screen:'Bookings'}]};
test('spec is a deterministic snapshot, never modifies the plan or adds requirements',()=>{const original=structuredClone(plan),spec=createAppSpec(plan);assert.deepEqual(spec.plan,original);assert.equal(spec.revision,createAppSpec(plan).revision);spec.plan.requirements[0].requirement='changed';assert.deepEqual(plan,original);assert.notEqual(createAppSpec(spec.plan).revision,createAppSpec(plan).revision);});
test('invalid/missing plans fail open',()=>{assert.equal(createAppSpec(null),null);assert.equal(createAppSpec({requirements:[...plan.requirements,...plan.requirements]}),null);assert.equal(requirementReport(null),null);});
test('model declaration and unrelated passed tests never prove acceptance',()=>{const report=requirementReport(createAppSpec(plan),[{source:'model-proposed-scenario',requirement:'R01',status:'passed'}],{requirements:[{id:'R01',declared:true,sourceFilesExist:true}]});assert.equal(report.rows[0].status,'not-verified');assert.equal(report.blocksPreview,false);assert.equal(report.automaticRepair,false);assert.equal(report.extraModelCalls,0);});
test('only exact acceptance matches attach evidence, scoped to recorded scenario',()=>{const check={source:'model-proposed-scenario',requirement:plan.requirements[0].acceptance,category:'funcional',status:'passed',evidence:'reloaded; booking visible'};const spec=createAppSpec(plan);assert.equal(requirementReport(spec,[check]).rows[0].status,'scenario-passed');assert.equal(requirementReport(spec,[{...check,status:'failed'}]).rows[0].status,'observed-failure');for(const category of ['visual','ambiente'])assert.equal(requirementReport(spec,[{...check,category,status:'pending'}]).rows[0].status,'not-verified');assert.equal(requirementReport(spec,[check,{...check,status:'pending'}]).rows[0].status,'not-verified');});
test('AppSpec reaches all three existing calls and replay makes no additional calls',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'dk-appspec-'));let calls=0;
 const opts={folder,apiKey:'sk-unit-test-placeholder-not-a-real-key',model:'gpt-5.6-luna',prompt:'Build a booking tool',stack:'react-v4',productPlan:plan,appSpec:createAppSpec(plan),fetchImpl:async(_,options)=>{
  const body=JSON.parse(options.body);assert.match(JSON.stringify(body.input),new RegExp(createAppSpec(plan).revision));assert.match(JSON.stringify(body.input),/Advisory traceability only/);calls++;
  const files=calls===1?[{name:'src/domain/rules.js',content:'export const available=true;'}]:calls===2?[{name:'src/App.jsx',content:'export default function App(){return null;}'},{name:'src/styles.css',content:'body{}'}]:[{name:'src/requirement-map.json',content:'[]'}];
  const value={title:'Booking',summary:'Booking',limitations:[],files,scenarios:[]};
  return new Response('data: '+JSON.stringify({type:'response.output_text.delta',delta:JSON.stringify(value)})+'\n\ndata: '+JSON.stringify({type:'response.completed',response:{usage:{input_tokens:10,output_tokens:20,total_tokens:30}}})+'\n\n');
 }};
 try{await generateModular(opts);assert.equal(calls,3);await generateModular({...opts,fetchImpl:()=>{throw Error('Unexpected extra call');}});assert.equal(calls,3);}finally{await fs.rm(folder,{recursive:true,force:true});}
});
