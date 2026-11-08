// Read-only panel validation; no generation or secret access.
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const origin='http://127.0.0.1:4310';const state=await(await fetch(origin+'/api/state')).json();
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/#generator');await page.locator('#acceptance-coverage').filter({hasText:'4/4'}).waitFor();
await page.frameLocator('#preview').locator('#total').filter({hasText:'5.00'}).waitFor();
await page.screenshot({path:'validation/panel-desktop.png',fullPage:true,animations:'disabled'});
const viewports=[];for(const width of [1440,768,391,320]){await page.setViewportSize({width,height:900});viewports.push({width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)});}
await page.screenshot({path:'validation/panel-mobile.png',fullPage:true,animations:'disabled'});
await page.setViewportSize({width:1440,height:1000});await page.goto(origin+'/#under-the-hood');await page.locator('#engine-live').filter({hasText:'LIVE READINGS'}).waitFor();await page.screenshot({path:'validation/under-the-hood.png',animations:'disabled'});
const preview=await browser.newPage();await preview.goto(state.previewUrl);const total=await preview.locator('#total').innerText();
const result={version:(await(await fetch(origin+'/api/engine')).json()).version,previewHTTP:(await fetch(state.previewUrl)).status,coverage:state.coverage,viewports,browserErrors:errors,persistedTotalAfterRestart:total};await fs.writeFile('validation/panel-release.json',JSON.stringify(result,null,2));await browser.close();console.log(JSON.stringify(result));if(errors.length||viewports.some(v=>v.overflow)||total!=='5.00')process.exitCode=1;
