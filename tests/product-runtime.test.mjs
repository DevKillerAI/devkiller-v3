import {test} from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {createServer} from './knowledge-server.mjs';
test('product API edits actual saved files, injects opt-in selector, and rolls back a failed candidate',{timeout:90000},async()=>{
 const s=await createServer({fixtureModule:'./tests/product-runtime-fixture.mjs'});
 try{
  await s.post('openai/key',{apiKey:'sk-browser-test-placeholder-not-a-real-key'});
  await s.post('generate',{prompt:'Create a simple working counter app for this integration test.',stack:'static-v1',knowledgeMode:'off'});let state=await s.ready();assert.equal(state.generation.status,'completed',state.generation.error);const id=state.project.id;
  const chat={projectId:id,revision:1,requestId:randomUUID(),message:'Please change this heading.',selection:{tag:'h1',text:'Contador de teste',selector:'h1',route:'/',revision:1}};
  const reply=await s.post('product/chat',chat);assert.ok(reply.changeRequest);assert.equal(reply.usage.total,130);assert.deepEqual(await s.post('product/chat',chat),reply,'same request reuses its receipt');
  await assert.rejects(s.post('product/chat',{...chat,requestId:randomUUID(),revision:2}),/400/);
  const edit={...chat,requestId:randomUUID(),message:reply.changeRequest};await s.post('product/revise',edit);await assert.rejects(s.post('product/revise',edit),/409/);
  state=await s.ready();assert.equal(state.generation.status,'completed',state.generation.error);assert.equal(state.project.revision,2);
  const html=await(await fetch(state.previewUrl)).text();assert.ok(html.includes('Revised title'));assert.ok(!html.includes('visual.js'));
  const editor=new URL(state.previewUrl);editor.searchParams.set('__dk_editor',randomUUID());editor.searchParams.set('__dk_parent','http://127.0.0.1:4330');const instrumented=await(await fetch(editor)).text();assert.match(instrumented,/visual\.js/);assert.match(instrumented,/revision=2/);
  const script=await fetch(new URL('/__devkiller/visual.js',state.previewUrl));assert.equal(script.status,200);assert.match(script.headers.get('content-type'),/javascript/);
  await s.post('product/revise',{projectId:id,revision:2,requestId:randomUUID(),message:'BREAK_EDIT deliberately introduce a fixture runtime error.'});state=await s.ready();assert.equal(state.generation.status,'failed');assert.equal(state.project.revision,2,'previous preview is restored');assert.ok((await(await fetch(state.previewUrl)).text()).includes('Revised title'));assert.ok(!(await(await fetch(state.previewUrl)).text()).includes('Deliberate test failure'));
  const details=await(await fetch(s.origin+'/api/projects/'+id)).json();assert.equal(details.versions.length,3);assert.equal(details.jobs.filter(j=>j.type==='user-edit').length,2);assert.equal(details.jobs.filter(j=>j.type==='conversation').length,1);
 }finally{await s.cleanup();}
});
