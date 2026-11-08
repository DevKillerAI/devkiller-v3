import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {ProjectStore} from '../modules/projects.mjs';
import {RunStore,executeGeneration} from '../modules/orchestrator.mjs';
const response={title:'Counter',summary:'Test fixture',limitations:[],files:[{name:'index.html',content:'<h1>Counter</h1>'}],usage:{input:10,output:20,total:30}};
async function setup(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'devkiller-orchestrator-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const projects=new ProjectStore(root),p=projects.create({prompt:'Build a counter'}),store=new RunStore(projects);const job={id:randomUUID(),projectId:p.id,prompt:'Build a counter',model:'fixture',stack:'static-v1',status:'running'};store.create(job);let calls=0;
  return {projects,store,job,args:{store,projectId:p.id,id:job.id,checkEnvironment:async()=>{},generate:async()=>{calls++;return structuredClone(response);},saveVersion:async(app,j)=>projects.saveVersion(p.id,app.files,{jobId:j.id,stack:j.stack}),deploy:async()=>({available:true})},calls:()=>calls};}
test('saved response resumes after build failure without another call or duplicate version',async t=>{const x=await setup(t);await assert.rejects(executeGeneration({...x.args,deploy:async()=>{throw new Error('Build unavailable');}}),/Build unavailable/);let r=x.store.get(x.job.projectId,x.job.id);assert.equal(r.status,'paused');assert.ok(r.response);assert.equal(r.calls,1);
  const fresh=new RunStore(new ProjectStore(x.projects.root));const result=await executeGeneration({...x.args,store:fresh});assert.equal(result.status,'completed');assert.equal(x.calls(),1);assert.equal(x.projects.details(x.job.projectId).versions.length,1);assert.equal(result.usageState,'confirmed');assert.equal(result.events.filter(e=>e.type==='provider.reserved').length,1);
});
test('crash between version commit and checkpoint is recovered without duplicate files',async t=>{const x=await setup(t);let once=true;await assert.rejects(executeGeneration({...x.args,saveVersion:async(app,j)=>{const revision=await x.args.saveVersion(app,j);if(once){once=false;throw new Error('Simulated crash after version commit');}return revision;}}));await executeGeneration(x.args);assert.equal(x.projects.details(x.job.projectId).versions.length,1);assert.equal(x.calls(),1);});
test('unknown provider outcome blocks resume and keeps the reserved call consumed',async t=>{const x=await setup(t);await assert.rejects(executeGeneration({...x.args,generate:async()=>{throw new Error('Connection lost');}}));const r=x.store.get(x.job.projectId,x.job.id);assert.equal(r.status,'uncertain');assert.equal(r.usageState,'unknown');assert.equal(r.calls,1);await assert.rejects(executeGeneration(x.args),/cannot be resumed/);assert.equal(x.calls(),0);});
test('restart distinguishes pre-call pause, saved receipt and in-flight uncertainty',async t=>{const x=await setup(t);x.store.recover();assert.equal(x.store.get(x.job.projectId,x.job.id).status,'paused');let r=x.store.claim(x.job.projectId,x.job.id);x.store.recover();assert.equal(x.store.get(r.projectId,r.id).status,'paused');r=x.store.claim(r.projectId,r.id);r=x.store.reserve(r);x.store.recover();assert.equal(x.store.get(r.projectId,r.id).status,'uncertain');
  const y=await setup(t);let saved=y.store.claim(y.job.projectId,y.job.id);saved=y.store.reserve(saved);y.store.checkpoint(saved,'provider.response-saved',{response,usage:response.usage,usageState:'confirmed'});y.store.recover();assert.equal(y.store.get(saved.projectId,saved.id).status,'paused');await executeGeneration(y.args);assert.equal(y.calls(),0);
});
test('concurrent claims and second reservations cannot exceed the saved budget',async t=>{const x=await setup(t);let r=x.store.claim(x.job.projectId,x.job.id);assert.throws(()=>x.store.claim(r.projectId,r.id),/cannot be resumed/);r=x.store.reserve(r);assert.throws(()=>x.store.reserve(r),/limit/);assert.equal(x.store.get(r.projectId,r.id).calls,1);});
test('cancel after receipt preserves the response but forbids silent continuation',async t=>{const x=await setup(t),controller=new AbortController();await assert.rejects(executeGeneration({...x.args,signal:controller.signal,generate:async()=>{controller.abort();return response;}}));const r=x.store.get(x.job.projectId,x.job.id);assert.equal(r.status,'cancelled');assert.ok(r.response);assert.equal(r.revision,null);await assert.rejects(executeGeneration(x.args),/cannot be resumed/);});
test('environment failure consumes no call and completed runs cannot be replayed',async t=>{const x=await setup(t);await assert.rejects(executeGeneration({...x.args,checkEnvironment:async()=>{throw new Error('Docker stopped');}}));assert.equal(x.store.get(x.job.projectId,x.job.id).calls,0);await executeGeneration(x.args);await assert.rejects(executeGeneration(x.args),/cannot be resumed/);assert.equal(x.calls(),1);});
test('a saved version is immutable for its execution id',async t=>{const x=await setup(t);await executeGeneration(x.args);assert.throws(()=>x.projects.saveVersion(x.job.projectId,[{name:'index.html',content:'Changed'}],{jobId:x.job.id}),/different files/);});
test('known rejection is not mislabeled as an unknown provider outcome',async t=>{const x=await setup(t);await assert.rejects(executeGeneration({...x.args,generate:async()=>{const error=new Error('Key rejected');error.providerOutcome='rejected';throw error;}}));assert.equal(x.store.get(x.job.projectId,x.job.id).status,'failed');await assert.rejects(executeGeneration(x.args),/cannot be resumed/);});

test('modular runs reserve each call and can recover between saved modules, never during an unknown call',async t=>{
 const x=await setup(t);const job={...x.job,id:randomUUID(),modularGeneration:true};x.store.create(job);
 let run=x.store.claim(job.projectId,job.id);run=x.store.reserve(run);
 x.store.checkpoint(run,'module.saved',{callInFlight:false,usage:{input:10,output:20,total:30},usageState:'confirmed'});
 x.store.recover();assert.equal(x.store.get(job.projectId,job.id).status,'paused');
 run=x.store.claim(job.projectId,job.id);run=x.store.reserve(run);x.store.recover();assert.equal(x.store.get(job.projectId,job.id).status,'uncertain');
 const next={...job,id:randomUUID()};x.store.create(next);
 const result=await executeGeneration({...x.args,id:next.id,generate:async(_j,_k,control)=>{for(const stage of ['foundation','foundation-1','features','features-1','integration']){control.reserve({id:stage,label:stage});control.checkpoint({stage,label:stage,files:['src/App.jsx'],usage:response.usage});}assert.throws(()=>control.reserve({id:'extra',label:'extra'}),/limit/);return response;}});
 assert.equal(result.calls,5);assert.equal(result.maxCalls,5);assert.equal(result.status,'completed');
});
