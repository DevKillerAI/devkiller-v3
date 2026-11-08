import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EngineHealth,summarizeProjects} from '../modules/engine-health.mjs';
const store={root:process.cwd(),list:()=>({projects:[{id:'one'}],errors:[]}),details:()=>({versions:[{}],dataRecords:2,jobs:[{id:'a',status:'completed',called:true,usage:{input:100,output:200},startedAt:2},{id:'b',status:'failed',called:true,usage:null,startedAt:1},{id:'c',status:'failed',called:false,startedAt:0}]})};
test('telemetria contabiliza uso conhecido e distingue chamadas sem consumo informado',()=>{
 const result=summarizeProjects(store);assert.equal(result.projects,1);assert.equal(result.versions,1);assert.equal(result.records,2);assert.equal(result.inputTokens,100);assert.equal(result.outputTokens,200);assert.equal(result.unknownUsage,1);assert.equal(result.jobs,3);assert.equal(result.completed,1);assert.equal(result.failed,2);
});
test('sensores compartilham consulta, usam limites reais e não apresentam chave salva como API verificada',async()=>{
 let checks=0;const health=new EngineHealth({runtime:{check:async()=>{checks++;return {ready:true,message:'Docker disponível'}},command:async()=>{checks++;return 'image-id'}},store,getState:()=>({busy:false,status:'stopped',active:null}),secretConfigured:()=>true,secretError:()=>null});
 const [a,b]=await Promise.all([health.sample(),health.sample()]);assert.equal(a,b);assert.equal(checks,10);assert.equal(await health.sample(),a);assert.equal(a.ready,true);assert.match(a.components.find(c=>c.id==='provider').detail,/Balance and model access/);assert.equal(a.capacity.generation.outputTokens,null);assert.equal(a.capacity.build.memoryMB,1024);assert.equal(a.capacity.preview.memoryMB,128);assert.ok(a.machine.memoryTotal>0);assert.ok(a.machine.processMemory>0);assert.ok(!JSON.stringify(a).includes('apiKey'));assert.equal(a.activity.previewActive,false);
 health.getState=()=>({busy:true,status:'generating'});const fresh=await health.sample({fresh:true});assert.notEqual(fresh,a);assert.equal(fresh.activity.busy,true);assert.equal(checks,10,'Atualização manual mantém o cache de infraestrutura.');
});
test('Docker indisponível e banco ilegível produzem aviso em vez de saúde inventada',async()=>{
 const health=new EngineHealth({runtime:{check:async()=>({ready:false,message:'Docker indisponível'}),command:async()=>{throw new Error('not installed')}},store:{root:process.cwd(),list:()=>{throw new Error('private details')}},getState:()=>({}),secretConfigured:()=>false,secretError:()=>null});
 const s=await health.sample();assert.equal(s.ready,false);assert.equal(s.status,'blocked');assert.equal(s.storage.projects,null);assert.equal(s.storage.errors,1);assert.equal(s.components.find(c=>c.id==='storage').status,'warning');assert.equal(s.capacity.profiles.react2,false);assert.ok(!JSON.stringify(s).includes('private details'));
});
