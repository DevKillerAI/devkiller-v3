import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import net from 'node:net';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function freePort(){const s=net.createServer();s.listen(0,'127.0.0.1');await once(s,'listening');const p=s.address().port;await new Promise(r=>s.close(r));return p;}

for(const stack of ['static-v1','react-v1'])test(`${stack}: gerar, salvar dados pela UI, reiniciar o servidor, reabrir e isolar dois aplicativos`, {timeout:120000},async()=>{
 const port=await freePort(),preview=await freePort(),compare=await freePort(),origin=`http://127.0.0.1:${port}`;let child,browser;
 async function state(){return (await fetch(origin+'/api/state')).json();}
 async function post(route,data={}){const s=await state();const r=await fetch(origin+route,{method:'POST',headers:{Origin:origin,'X-DevKiller-Token':s.token,'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await r.json();assert.ok(r.ok,result.error);return result;}
 async function ready(){for(let i=0;i<180;i++){try{const s=await state();if(!s.busy)return s;}catch{}await delay(100);}throw new Error('Servidor não ficou pronto.');}
 async function start(){child=spawn(process.execPath,['--import','./tests/openai-fixture.mjs','server.mjs'],{cwd:root,env:{...process.env,DEVKILLER_PORT:String(port),DEVKILLER_PREVIEW_PORT:String(preview),DEVKILLER_COMPARISON_PORT:String(compare)},windowsHide:true,stdio:'ignore'});return ready();}
 async function stop(){const exited=once(child,'exit');await post('/api/shutdown');await exited;child=null;}
 try{
   await start();assert.equal((await(await fetch(origin+'/api/projects')).json()).projects.length,0);
   await post('/api/connection',{provider:'openai',model:'gpt-5.6-terra'});
   await post('/api/openai/key',{apiKey:'sk-browser-test-placeholder-not-a-real-key'});
   await post('/api/generate',{prompt:'BANCO_LOCAL aplicativo A',stack,professionalDelivery:false});let a=await ready();assert.equal(a.generation.status,'completed');assert.equal(a.generation.model,'gpt-5.6-terra');const id=a.project.id,firstUrl=a.previewUrl;
   assert.equal((await(await fetch(origin+'/api/projects/'+id)).json()).dataRecords,0,'QA não pode gravar no banco real');
   browser=await chromium.launch({headless:true});let page=await browser.newPage();await page.goto(origin);
   const frame=page.frameLocator('#preview');await frame.locator('#save').click();await frame.locator('#count').filter({hasText:'1'}).waitFor();
   await page.getByRole('button',{name:'Details and versions'}).click();await page.locator('#project-details').getByText('Original request: BANCO_LOCAL aplicativo A').waitFor();
   await browser.close();browser=null;await stop();
   await start();assert.equal((await state()).connection.model,'gpt-5.6-terra');assert.equal((await state()).active,null);await post('/api/projects/open',{id});a=await state();assert.equal(a.previewUrl,firstUrl);assert.equal(a.originalPrompt,'BANCO_LOCAL aplicativo A');
   browser=await chromium.launch({headless:true});page=await browser.newPage();await page.goto(origin);await page.frameLocator('#preview').locator('#count').filter({hasText:'1'}).waitFor();
   const history=await(await fetch(origin+'/api/projects/'+id)).json();assert.equal(history.jobs.length,1);assert.equal(history.jobs[0].usage.output,456);
   await post('/api/generate',{prompt:'BANCO_LOCAL aplicativo B',stack,professionalDelivery:false});const b=await ready();assert.notEqual(b.project.id,id);assert.notEqual(b.previewUrl,firstUrl);
   const pageB=await browser.newPage();await pageB.goto(b.previewUrl);await pageB.locator('#count').filter({hasText:'0'}).waitFor();
   assert.equal((await(await fetch(new URL('/__devkiller/data/'+(stack==='react-v1'?'count':'contador'),firstUrl))).json()).value,1);
   const forbidden=await fetch(new URL('/__devkiller/data/contador',b.previewUrl),{method:'PUT',headers:{Origin:firstUrl,'Content-Type':'application/json'},body:JSON.stringify({value:99})});assert.equal(forbidden.status,403);
   await post('/api/projects/open',{id,version:1});const persisted=await(await fetch(origin+'/api/projects/'+id)).json();assert.equal(persisted.versions.length,1);assert.equal(persisted.jobs.length,1);
   await stop();
 }finally{
   if(browser)await browser.close();if(child&&child.exitCode===null){const exited=once(child,'exit');child.kill();await exited;}
   for(const parent of ['projects','.secrets','settings']){const target=path.resolve(root,parent,String(port));assert.equal(path.dirname(target),path.join(root,parent));await fs.rm(target,{recursive:true,force:true});}
 }
});
