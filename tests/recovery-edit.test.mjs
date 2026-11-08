import {test} from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import path from 'node:path';
import {ProjectStore} from '../modules/projects.mjs';import {createServer,root} from './knowledge-server.mjs';
test('latest failed initial version can be repaired without a preview; stale versions and DOM selections cannot',{timeout:60000},async()=>{
 const s=await createServer({fixtureModule:'./tests/product-runtime-fixture.mjs'});try{
 await s.post('openai/key',{apiKey:'sk-browser-test-placeholder-not-a-real-key'});const store=new ProjectStore(path.join(root,'projects',String(s.port))),p=store.create({prompt:'Recover a saved initial version'});
 const files=[{name:'index.html',content:'<!doctype html><html><body><h1>Contador de teste</h1></body></html>'}];store.saveVersion(p.id,files,{status:'preview-failed',stack:'static-v1',qa:[{category:'funcional',status:'failed',evidence:'Fixture initial build failure'}]});store.saveVersion(p.id,files,{status:'preview-failed',stack:'static-v1'});
 const edit={projectId:p.id,revision:2,requestId:randomUUID(),message:'Fix the initial saved version'};
 await assert.rejects(s.post('product/revise',{...edit,revision:1}),/409/);await assert.rejects(s.post('product/revise',{...edit,selection:{tag:'h1',text:'Contador de teste',selector:'h1',route:'/',revision:2}}),/409/);
 await s.post('product/revise',edit);const state=await s.ready();assert.equal(state.generation.status,'completed',state.generation.error);assert.equal(state.project.revision,3);assert.match(await(await fetch(state.previewUrl)).text(),/Revised title/);
 }finally{await s.cleanup();}
});
