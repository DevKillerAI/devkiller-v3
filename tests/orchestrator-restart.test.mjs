import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function freePort(){const s=net.createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const p=s.address().port;await new Promise(r=>s.close(r));return p;}
for(const fault of ['CRASH_RECEIPT','CRASH_VERSION','CRASH_PROVIDER','DUPLICATE_PANEL'])test(`process crash ${fault}: durable recovery through HTTP and UI`,{timeout:90000},async()=>{
 const port=await freePort(),preview=await freePort(),comparison=await freePort(),origin=`http://127.0.0.1:${port}`;let child,browser;
 async function state(){return (await fetch(origin+'/api/state')).json();}
 async function post(route,data={}){const s=await state(),r=await fetch(origin+route,{method:'POST',headers:{Origin:origin,'X-DevKiller-Token':s.token,'Content-Type':'application/json'},body:JSON.stringify(data)});return {ok:r.ok,status:r.status,data:await r.json()};}
 async function ready(){for(let i=0;i<300;i++){try{const s=await state();if(!s.busy)return s;}catch{}await delay(100);}throw new Error('Test server did not become ready');}
 async function start(){child=spawn(process.execPath,['--import','./tests/orchestrator-fixture.mjs','server.mjs'],{cwd:root,env:{...process.env,DEVKILLER_PORT:String(port),DEVKILLER_PREVIEW_PORT:String(preview),DEVKILLER_COMPARISON_PORT:String(comparison)},windowsHide:true,stdio:'ignore'});await ready();}
 try{
   await start();assert.ok((await post('/api/openai/key',{apiKey:'sk-browser-test-placeholder-not-a-real-key'})).ok);
   if(fault==='DUPLICATE_PANEL'){
     assert.ok((await post('/api/generate',{prompt:'CANCELAR duplicate panel test',stack:'static-v1',professionalDelivery:false})).ok);
     const duplicate=spawn(process.execPath,['--import','./tests/orchestrator-fixture.mjs','server.mjs'],{cwd:root,env:{...process.env,DEVKILLER_PORT:String(port),DEVKILLER_PREVIEW_PORT:String(preview),DEVKILLER_COMPARISON_PORT:String(comparison)},windowsHide:true,stdio:'ignore'});
     const [code]=await once(duplicate,'exit');assert.equal(code,1);
     assert.equal((await(await fetch(origin+'/api/executions')).json()).executions[0].status,'running','Duplicate launch must not recover a live execution');
     await post('/api/generation/cancel');await ready();return;
   }
   const exit=once(child,'exit');assert.ok((await post('/api/generate',{prompt:`BANCO_LOCAL ENGINE_SCENARIO ${fault}`,stack:'static-v1',professionalDelivery:false})).ok);await exit;child=null;
   await start();let runs=(await(await fetch(origin+'/api/executions')).json()).executions;assert.equal(runs.length,1);const run=runs[0];assert.equal(run.calls,1);
   if(fault==='CRASH_PROVIDER'){assert.equal(run.status,'uncertain');assert.equal(run.canResume,false);assert.equal((await post('/api/executions/resume',{projectId:run.projectId,id:run.id})).status,409);}
   else{
     assert.equal(run.status,'paused');assert.equal(run.hasSavedResponse,true);
     browser=await chromium.launch({headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/#generator');
     await page.getByText('Saved executions and recovery',{exact:true}).click();await page.locator('#saved-executions summary').first().click();await page.getByRole('button',{name:'Continue with saved code'}).click();
     const s=await ready();assert.equal(s.generation.status,'completed',s.generation.error);assert.equal(s.orchestration.status,'completed');assert.equal(s.coverage.passed,1);assert.equal(s.coverage.failed,0);
     const info=await(await fetch(origin+'/api/projects/'+run.projectId)).json();assert.equal(info.versions.length,1);assert.equal(info.jobs.length,1);
     // The real iframe writes its startup marker; only the QA clicked Save so far.
     assert.equal((await(await fetch(new URL('/__devkiller/data/contador',s.previewUrl))).json()).value,null,'QA must not save its counter in the real project database');
     await page.frameLocator('#preview').locator('#save').click();await page.frameLocator('#preview').locator('#count').filter({hasText:'1'}).waitFor();
     assert.equal((await(await fetch(new URL('/__devkiller/data/contador',s.previewUrl))).json()).value,1);
     await post('/api/qa');assert.equal((await(await fetch(new URL('/__devkiller/data/contador',s.previewUrl))).json()).value,1,'Rechecking must keep user data');
     assert.equal((await post('/api/executions/resume',{projectId:run.projectId,id:run.id})).status,409);assert.deepEqual(errors,[]);
     if(fault==='CRASH_RECEIPT'){await fs.mkdir(path.join(root,'evidencias','orchestrator'),{recursive:true});await page.screenshot({path:path.join(root,'evidencias','orchestrator','recovery.png'),fullPage:true});}
   }
   assert.equal(await fs.readFile(path.join(root,'projects',String(port),'fixture-calls.txt'),'utf8'),'1','Exactly one simulated provider call across process restarts');
 }finally{
   if(browser)await browser.close();if(child?.exitCode===null){const exit=once(child,'exit');try{await post('/api/shutdown');}catch{child.kill();}await exit;}
   for(const parent of ['projects','.secrets','settings']){const target=path.resolve(root,parent,String(port));assert.equal(path.dirname(target),path.join(root,parent));await fs.rm(target,{recursive:true,force:true});}
 }
});
