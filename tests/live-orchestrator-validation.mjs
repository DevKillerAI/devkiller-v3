// Explicit manual validation only. NOT included in npm test. Exactly one API generation per invocation.
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const phase=process.argv[2];if(!['baseline','candidate'].includes(phase))throw new Error('Choose baseline or candidate explicitly.');
const origin='http://127.0.0.1:4310',folder=new URL('../evidencias/orchestrator/',import.meta.url);
const prompt='Build an English single-page expense tracker with a polished, responsive interface. Use the supported local app database for persistent records. Start empty. Provide an input with id description, a numeric amount input with id amount, a Category select with id category and options Food and Travel (option values Food and Travel), and a button with id add-expense labeled Add expense. Add rows to a table whose tbody has id expenses. Each row shows description, amount, category, and a Delete button. Reject blank descriptions and zero or negative amounts without adding a row. Show the sum of ALL saved expenses in an element with id total, containing only the number with two decimal places (no currency symbol). Include a category filter select with id filter: All, Food, Travel (same option values); filtering only changes visible rows, never the total. Preserve records after reloading. Each row Delete button removes that row and updates the total and saved data. Do not include sample records, login, external APIs, or fake actions. All controls must work. Keep these exact HTML ids to make the requested behaviors testable.';
const state=async()=>{const r=await fetch(origin+'/api/state');if(!r.ok)throw new Error('Panel unavailable');return r.json();};
const start=await state();if(start.busy)throw new Error('The panel is busy; no generation was started.');
const engine=await(await fetch(origin+'/api/engine')).json();
if(process.argv[3]!=='verify-existing'&&engine.version!==(phase==='baseline'?'0.10.0':'0.11.0'))throw new Error('The phase label must match the running backend version. No generation was started.');
let submitted;
if(process.argv[3]==='verify-existing'){
 const saved=JSON.parse(await fs.readFile(new URL(`${phase}-live.json`,folder),'utf8'));if(start.generation?.id!==saved.jobId)throw new Error('Open the same saved validation app first.');submitted=start;
}else{
 const r=await fetch(origin+'/api/generate',{method:'POST',headers:{Origin:origin,'X-DevKiller-Token':start.token,'Content-Type':'application/json'},body:JSON.stringify({prompt,stack:'react-v2'})});
 if(!r.ok)throw new Error('Generation was not accepted: '+r.status);submitted=await r.json();
}
const id=submitted.generation.id;let final,previous='',lastReport=0;
for(let i=0;i<420;i++){
 const s=await state();if(s.generation?.id!==id)throw new Error('Another generation replaced this validation.');
 if(s.generation.stage!==previous||Date.now()-lastReport>20000){previous=s.generation.stage;lastReport=Date.now();console.log(`${phase}: ${previous}, ${s.generation.characters||0} characters received`);}
 if(!s.busy){final=s;break;}await new Promise(resolve=>setTimeout(resolve,1000));
}
if(!final)throw new Error('Validation wait ended; inspect the saved execution. No retry was started.');
const report={phase,prompt,jobId:id,model:final.generation.model,status:final.generation.status,usage:final.generation.usage,startedAt:final.generation.startedAt,finishedAt:final.generation.finishedAt,projectId:final.generation.projectId,previewUrl:final.previewUrl,engineQA:final.qa,coverage:final.coverage||null,checks:[],error:final.generation.error||null};
let browser;
try{
 if(final.generation.status!=='completed')throw new Error(report.error||'Generation did not complete');
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(final.previewUrl);
 // Empty/loading table rows are presentation, not expense records.
 const row=()=>page.locator('#expenses tr').filter({has:page.getByRole('button',{name:/delete/i})});
 async function expectValue(label,read,expected){let actual;for(let i=0;i<40;i++){actual=await read();if(actual===expected)break;await page.waitForTimeout(100);}report.checks.push({label,expected,actual,passed:actual===expected});if(actual!==expected)throw new Error(`${label}: expected ${expected}, observed ${actual}`);}
 async function add(description,amount,category){await page.locator('#description').fill(description);await page.locator('#amount').fill(amount);await page.locator('#category').selectOption(category);await page.locator('#add-expense').click();}
 await expectValue('Starts without sample data',()=>row().count(),0);
 await add('Coffee','10','Food');await add('Bus','5','Travel');await expectValue('Adds two records',()=>row().count(),2);await expectValue('Adds the saved amounts',()=>page.locator('#total').innerText(),'15.00');
 await add('Invalid','-7','Food');await expectValue('Rejects negative amounts',()=>row().count(),2);
 await page.locator('#filter').selectOption('Food');await expectValue('Filters by category',()=>row().count(),1);await expectValue('Filtering preserves the overall total',()=>page.locator('#total').innerText(),'15.00');
 await page.reload();await page.locator('#filter').selectOption('All');await expectValue('Records survive reload',()=>row().count(),2);await expectValue('Total survives reload',()=>page.locator('#total').innerText(),'15.00');
 await row().filter({hasText:'Coffee'}).getByRole('button',{name:/delete/i}).click();await expectValue('Deletes the selected record',()=>row().count(),1);await expectValue('Deletion updates the total',()=>page.locator('#total').innerText(),'5.00');
 await page.reload();await expectValue('Deletion persists after reload',()=>row().count(),1);
 report.browserErrors=errors;report.checks.push({label:'No observed browser exceptions',passed:errors.length===0,actual:errors});
 await page.screenshot({path:new URL(`${phase}-live.png`,folder).pathname.replace(/^\/([A-Z]:)/,'$1')});
}catch(error){report.verificationError=error.message;}finally{if(browser)await browser.close();await fs.writeFile(new URL(`${phase}-live.json`,folder),JSON.stringify(report,null,2));}
console.log(JSON.stringify({phase,status:report.status,usage:report.usage,checks:report.checks.length,passed:report.checks.filter(c=>c.passed).length,error:report.error||report.verificationError||null,projectId:report.projectId}));
