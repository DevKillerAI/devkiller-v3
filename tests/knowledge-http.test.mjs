import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {createServer,root} from './knowledge-server.mjs';

test('knowledge HTTP/UI: settings, index, source control, real lookup and mobile layout', {timeout:90000},async()=>{
  const s=await createServer();let browser;
  try{
    const rejected=await fetch(s.origin+'/api/knowledge/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'off'})});assert.equal(rejected.status,403);
    await s.post('openai/key',{apiKey:'sk-browser-test-placeholder-not-a-real-key'});
    browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(s.origin+'/#generator');
    await page.locator('#knowledge-mode').selectOption('off');await page.locator('#knowledge-save').click();await page.locator('#knowledge-status').filter({hasText:'Off'}).waitFor();assert.equal((await(await fetch(s.origin+'/api/knowledge')).json()).mode,'off');
    await page.locator('#knowledge-mode').selectOption('hybrid');await page.locator('#knowledge-save').click();await page.locator('#knowledge-status').filter({hasText:'Hybrid'}).waitFor();
    await page.locator('#knowledge-build').click();await page.locator('#knowledge-status').filter({hasText:'Semantic index ready'}).waitFor();
    await page.getByText('Sources and retrieval preview',{exact:true}).click();await page.locator('#knowledge-query').fill('money cents rounding');await page.locator('#knowledge-search').click();await page.locator('#knowledge-results summary').first().waitFor();assert.match(await page.locator('#knowledge-results').innerText(),/Hybrid retrieval/);
    const first=page.locator('#knowledge-results summary').first();await first.click();assert.ok((await page.locator('#knowledge-results pre').first().innerText()).length>100);
    const sourceCount=(await(await fetch(s.origin+'/api/knowledge')).json()).sources.length;
    await page.getByRole('checkbox',{name:'Enable Money: integer cents, exact totals and rounding'}).uncheck();await page.locator('#knowledge-status').filter({hasText:`${sourceCount-1}/${sourceCount}`}).waitFor();
    await fs.mkdir(path.join(root,'evidencias','rag'),{recursive:true});await page.locator('#knowledge').screenshot({path:path.join(root,'evidencias','rag','knowledge-desktop.png')});
    await page.setViewportSize({width:390,height:844});await page.locator('#knowledge').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(root,'evidencias','rag','knowledge-mobile.png')});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
    const json=await(await fetch(s.origin+'/api/knowledge')).text();assert.ok(!json.includes('sk-browser'));assert.ok(!json.includes('Authorization'));
  }finally{await browser?.close();await s.cleanup();}
});
test('actual process death after context save resumes without repeating retrieval or generation', {timeout:90000},async()=>{
  const s=await createServer();try{
    await s.post('openai/key',{apiKey:'sk-browser-test-placeholder-not-a-real-key'});await s.post('knowledge/rebuild');await s.ready();const indexCalls=Number(await fs.readFile(path.join(root,'settings',String(s.port),'embedding-calls.txt'),'utf8'));
    const exit=once(s.child(),'exit');await s.post('generate',{prompt:'BANCO_LOCAL CRASH_KNOWLEDGE money cents persistência',stack:'static-v1',knowledgeMode:'hybrid',professionalDelivery:false});await exit;await s.start();
    const runs=(await(await fetch(s.origin+'/api/executions')).json()).executions;assert.equal(runs[0].calls,0);assert.ok(runs[0].knowledge.chunks.length);const before=await(await fetch(s.origin+`/api/knowledge/context?project=${runs[0].projectId}&execution=${runs[0].id}`)).json();
    await s.post('executions/resume',{projectId:runs[0].projectId,id:runs[0].id});const finished=await s.ready();assert.equal(finished.generation.status,'completed',finished.generation.error);assert.equal(finished.orchestration.calls,1);
    const after=await(await fetch(s.origin+`/api/knowledge/context?project=${runs[0].projectId}&execution=${runs[0].id}`)).json();assert.deepEqual(after,before);
    assert.equal(await fs.readFile(path.join(root,'settings',String(s.port),'embedding-calls.txt'),'utf8'),String(indexCalls+1),'Index batches plus one query across restarts');assert.equal(await fs.readFile(path.join(root,'projects',String(s.port),'fixture-calls.txt'),'utf8'),'1');
  }finally{await s.cleanup();}
});

