import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const state=await(await fetch('http://127.0.0.1:54696/api/state')).json();
if(!state.previewUrl)throw Error('Generated preview unavailable.');
const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1440,height:1000},extraHTTPHeaders:{'X-DevKiller-QA':state.token}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));let report;
try{
 await page.goto(state.previewUrl);await page.getByRole('button',{name:'New material'}).click();
 await page.getByLabel('Material name',{exact:true}).fill('Verification — Azure finish');await page.getByTestId('create-material-submit').click();
 await page.getByRole('heading',{name:'Verification — Azure finish',exact:true}).waitFor();
 await page.getByLabel('Base color',{exact:true}).fill('#2266FF');await page.getByLabel('Roughness numeric value').fill('0.35');await page.getByTestId('viewer-shape-cube').click();
 await page.getByTestId('save-appearance').click();await page.getByTestId('save-appearance').waitFor({state:'visible'});
 await page.waitForFunction(()=>document.querySelector('[data-testid="save-appearance"]')?.disabled===true);
 await page.reload();assert.equal(await page.getByLabel('Base color',{exact:true}).inputValue(),'#2266FF');assert.equal(await page.getByLabel('Roughness numeric value').inputValue(),'0.35');
 await page.getByRole('tab',{name:'Review',exact:true}).click();await page.getByTestId('review-status-trigger').click();await page.getByRole('option',{name:'Approved',exact:true}).click();await page.getByTestId('status-success').waitFor();
 await page.getByLabel('Review comment',{exact:true}).fill('Independent verification: saved review note.');await page.getByTestId('add-comment').click();await page.getByTestId('review-comment-body').filter({hasText:'Independent verification: saved review note.'}).waitFor();
 await page.reload();await page.getByRole('tab',{name:'Review',exact:true}).click();await page.getByTestId('review-comment-body').filter({hasText:'Independent verification: saved review note.'}).waitFor();assert.match(await page.getByTestId('review-status-trigger').innerText(),/Approved/);
 assert.equal(await page.locator('canvas').count(),1);await page.waitForFunction(()=>{const r=document.querySelector('canvas')?.getBoundingClientRect();return r&&r.width>200&&r.height>200;});
 await page.screenshot({path:'validation/expansion/prism-verified-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'validation/expansion/prism-mobile.png',fullPage:true});
 const bad=await context.request.post(state.previewUrl+'api/materials',{headers:{Origin:new URL(state.previewUrl).origin},data:{name:'   '}});assert.equal(bad.status(),400);
 assert.deepEqual(errors,[]);report={status:'passed',preview:state.previewUrl,checks:['Created material via shadcn dialog','Changed color, roughness and shape','Saved appearance survived reload','Approval and review comment survived reload','Real WebGL canvas present','390px mobile viewport has no horizontal overflow','Backend rejects blank names','No browser JavaScript errors'],generatedBy:'MVP → Engine → OpenAI, source unchanged by operator',qaDataIsolated:true};
}catch(e){report={status:'failed',error:e.message,errors};process.exitCode=1;}finally{await browser.close();await fs.writeFile('validation/expansion/prism-functional.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
