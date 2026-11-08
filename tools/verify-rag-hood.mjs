import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const origin='http://127.0.0.1:4310';
 const [knowledge,records]=await Promise.all(['/api/knowledge','/api/executions'].map(async p=>(await fetch(origin+p)).json()));
 const lookups=records.executions.filter(r=>r.knowledge&&r.knowledge.requestedMode!=='off');
 await page.goto(origin+'/#under-the-hood');
 await page.locator('#hood-rag-badge').filter({hasText:'RAG ENABLED'}).waitFor();
 assert.equal(await page.locator('#hood-rag-queries').textContent(),lookups.length.toLocaleString('en-US'));
 assert.equal(await page.locator('#hood-rag-references').textContent(),lookups.reduce((n,r)=>n+r.knowledge.chunks.length,0).toLocaleString('en-US'));
 assert.equal(await page.locator('#hood-rag-sources').textContent(),`${knowledge.sources.filter(s=>s.enabled).length} / ${knowledge.sources.length}`);
 await page.locator('.rag-history summary').click();
 assert.equal(await page.locator('.rag-query').count(),Math.min(6,lookups.length));
 await fs.mkdir('evidencias/rag',{recursive:true});
 await page.locator('.rag-instruments').screenshot({path:'evidencias/rag/hood-rag-desktop.png'});
 await page.locator('.rag-history summary').click();
 await page.setViewportSize({width:390,height:844});await page.locator('.rag-instruments').scrollIntoViewIfNeeded();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('.rag-instruments').screenshot({path:'evidencias/rag/hood-rag-mobile.png'});
 // Change only responses inside this isolated browser; saved settings stay untouched.
 await page.route('**/api/knowledge',route=>route.fulfill({json:{...knowledge,mode:'off'}}));
 await page.locator('#scan-engine').click();await page.locator('#hood-rag-badge').filter({hasText:'RAG OFF'}).waitFor();
 await page.unroute('**/api/knowledge');await page.route('**/api/knowledge',route=>route.fulfill({status:503,json:{error:'fixture'}}));
 await page.locator('#scan-engine').click();await page.locator('#hood-rag-badge').filter({hasText:'READING UNAVAILABLE'}).waitFor();
 assert.match(await page.locator('#hood-rag-summary').textContent(),/previous reading/);
 await page.unroute('**/api/knowledge');
 await page.route('**/api/executions',route=>route.fulfill({json:{executions:[]}}));
 await page.locator('#scan-engine').click();await page.locator('#hood-rag-queries').filter({hasText:/^0$/}).waitFor();
 assert.equal(await page.locator('#hood-rag-latency').textContent(),'—');
 assert.equal(await page.locator('#hood-rag-latest-title').textContent(),'No saved generation lookup yet');
 assert.deepEqual(errors,[]);
 const report={checkedAt:new Date().toISOString(),savedLookups:lookups.length,sourceCount:knowledge.sources.length,desktop:true,mobileOverflow:false,offState:true,staleReadingState:true,emptyHistory:true,browserErrors:errors,backendSettingsChanged:false,paidModelCalls:0};
 await fs.writeFile('evidencias/rag/hood-rag-verification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();}
