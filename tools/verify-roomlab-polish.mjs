import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {ProjectStore} from '../modules/projects.mjs';
import {digest} from '../modules/knowledge.mjs';
const origin='http://127.0.0.1:4310',id='46ee1b69-734a-4406-bf75-0324d0d0e060',store=new ProjectStore('projects/4310');
const hash=()=>store.use(id,db=>digest(JSON.stringify(db.prepare('SELECT key,value FROM app_data ORDER BY key').all()))),before=hash(),s=await(await fetch(origin+'/api/state')).json();if(s.busy)throw new Error('Engine busy.');
const response=await fetch(origin+'/api/projects/open',{method:'POST',headers:{Origin:origin,'X-DevKiller-Token':s.token,'Content-Type':'application/json'},body:JSON.stringify({id,version:2})});assert.equal(response.ok,true);const result=await response.json();
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:1440,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
try{await page.goto(result.previewUrl);await page.locator('.mobile-bar').waitFor({state:'attached'});assert.equal(await page.locator('.mobile-bar').isVisible(),false);for(const h of await page.locator('.mobile-panel-head').all())assert.equal(await h.isVisible(),false);await page.screenshot({path:'validation/studio-v1/roomlab-desktop.png',fullPage:true});
await page.setViewportSize({width:391,height:850});assert.equal(await page.locator('.mobile-bar').isVisible(),true);await page.locator('.mobile-bar').getByRole('button',{name:'Library',exact:true}).click();const drawer=page.locator('.drawer-wrap.open');await drawer.waitFor();assert.equal(await drawer.locator('.mobile-panel-head').isVisible(),true);await drawer.locator('.mobile-panel-head button').click();await drawer.waitFor({state:'hidden'});assert.deepEqual(errors,[]);assert.equal(hash(),before);await page.screenshot({path:'validation/studio-v1/roomlab-mobile.png',fullPage:true});
const report=JSON.parse(await fs.readFile('validation/studio-v1/roomlab.json','utf8'));Object.assign(report,{preview:result.previewUrl,browserVerified:true,desktopMobileVisibility:true,mobileLibraryClose:true,dataPreservedAfterBrowser:true,browserErrors:errors});await fs.writeFile('validation/studio-v1/roomlab.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
