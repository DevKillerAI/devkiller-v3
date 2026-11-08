// Explicit real-API study; never discovered by npm test. No failed trial is retried.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {createServer,root,delay} from './knowledge-server.mjs';
import {retrievalCases,generationCases} from './rag-evaluation-cases.mjs';
if(process.argv[2]!=='--run')throw new Error('Use --run to explicitly start the bounded real-API evaluation.');
const folder=path.join(root,'evidencias','rag','live-'+new Date().toISOString().replace(/[:.]/g,'-'));
await fs.mkdir(folder,{recursive:true});
const manifest={startedAt:new Date().toISOString(),maxGenerations:12,maxRepairs:4,repetitions:2,cases:generationCases,retrievalCases,corpusHash:createHash('sha256').update(await fs.readFile(path.join(root,'knowledge','recipes.json'))).digest('hex'),purpose:'Paired pilot, not statistical proof. Acceptance checks are fixed independently of generated scenarios.'};
await fs.writeFile(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2));
console.log('Evidence: '+folder);
const server=await createServer({fixture:false,real:true});let browser;
const reports=[],retrieval=[];let lastStage='',lastUpdate=0;
async function wait(label){return server.ready(300000,s=>{const stage=s.generation?.stage||s.repair?.stage||s.status;if(stage!==lastStage||Date.now()-lastUpdate>20000){lastStage=stage;lastUpdate=Date.now();console.log(label+': '+stage);}});}
async function save(name,value){await fs.writeFile(path.join(folder,name+'.json'),JSON.stringify(value,null,2));}
async function inspect(kind,url,name){
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),checks=[],errors=[];page.setDefaultTimeout(3000);page.on('pageerror',e=>errors.push(e.message));let rejectWrite=false;
  await page.route('**/__devkiller/data/**',async route=>{if(rejectWrite&&route.request().method()==='PUT'){rejectWrite=false;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Controlled acceptance-test save failure'})});}else await route.continue();});
  const check=async(label,read,expected)=>{let actual,error;try{for(let i=0;i<25;i++){actual=await read();if(actual===expected)break;await delay(80);}}catch(e){error=e.message.slice(0,300);}checks.push({label,expected,actual,error,passed:actual===expected&&!error});};
  const action=async fn=>{try{await fn();await delay(180);}catch(e){checks.push({label:'Required interaction',passed:false,error:e.message.slice(0,300)});}};
  try{
    await page.goto(url);await delay(400);
    if(kind==='expenses'){
      const rows=()=>page.locator('#expenses tr').filter({has:page.getByRole('button',{name:/delete/i})});
      const add=(desc,amount,cat)=>action(async()=>{await page.locator('#description').fill(desc);await page.locator('#amount').fill(amount);await page.locator('#category').selectOption(cat);await page.locator('#add-expense').click();});
      await check('Starts empty',()=>rows().count(),0);await add('  ','2','Food');await check('Reject whitespace descriptions',()=>rows().count(),0);
      await add('Coffee','0.10','Food');await add('Bus','0.20','Travel');await check('Adds both expenses',()=>rows().count(),2);await check('Exact decimal sum',()=>page.locator('#total').innerText(),'0.30');
      await add('Invalid','-7','Food');await check('Reject negative amounts',()=>rows().count(),2);await add('Zero','0','Food');await check('Reject zero amounts',()=>rows().count(),2);
      await action(()=>page.locator('#filter').selectOption('Food'));await check('Category filter',()=>rows().count(),1);await check('Filter preserves global total',()=>page.locator('#total').innerText(),'0.30');
      await action(()=>page.reload());await action(()=>page.locator('#filter').selectOption('All'));await check('Records survive reload',()=>rows().count(),2);
      rejectWrite=true;await add('Rejected write','3','Food');await check('Failed save does not add a record',()=>rows().count(),2);await check('Failed save preserves entered description',()=>page.locator('#description').inputValue(),'Rejected write');await check('Save error visible',async()=>/not saved|failed|error|could not|unable/i.test(await page.locator('body').innerText()),true);
      await add('<b>literal</b>','1','Food');await check('Literal user text is preserved',async()=>await rows().filter({hasText:'<b>literal</b>'}).count(),1);await check('User text did not become HTML',()=>page.locator('#expenses b').count(),0);
      await action(()=>rows().filter({hasText:'<b>literal</b>'}).getByRole('button',{name:/delete/i}).click());await action(()=>rows().filter({hasText:'Coffee'}).getByRole('button',{name:/delete/i}).click());await check('Deletion recalculates total',()=>page.locator('#total').innerText(),'0.20');await action(()=>page.reload());await check('Deletion survives reload',()=>rows().count(),1);
    }else if(kind==='inventory'){
      const rows=()=>page.locator('#products tr').filter({has:page.getByRole('button',{name:/delete/i})});
      const fill=(name,q,p,m)=>action(async()=>{await page.locator('#name').fill(name);await page.locator('#quantity').fill(q);await page.locator('#price').fill(p);await page.locator('#minimum').fill(m);await page.locator('#save-product').click();});
      await check('Starts empty',()=>rows().count(),0);await fill('Apple','2','0.10','3');await fill('Banana','3','0.20','1');await check('Adds products',()=>rows().count(),2);await check('Exact inventory valuation',()=>page.locator('#valuation').innerText(),'0.80');
      await fill('Fractional','1.5','1','0');await check('Reject fractional quantity',()=>rows().count(),2);await fill('Negative','-1','1','0');await check('Reject negative quantity',()=>rows().count(),2);
      await action(()=>page.locator('#low-stock').check());await check('Low-stock selection',()=>rows().count(),1);await check('Global valuation survives filter',()=>page.locator('#valuation').innerText(),'0.80');
      await action(()=>rows().filter({hasText:'Apple'}).getByRole('button',{name:/edit/i}).click());await fill('Apple','5','0.10','3');await check('Updated item exits low-stock view',()=>rows().count(),0);await check('Edit updates global valuation',()=>page.locator('#valuation').innerText(),'1.10');
      await action(()=>page.locator('#low-stock').uncheck());await action(()=>page.reload());await action(()=>page.locator('#low-stock').uncheck());await check('Edited data survives reload',()=>page.locator('#valuation').innerText(),'1.10');
      await action(()=>page.locator('#search').fill('Apple'));await check('Search selects correct item',()=>rows().count(),1);await action(()=>rows().first().getByRole('button',{name:/edit/i}).click());await action(()=>page.locator('#quantity').fill('99'));await action(()=>page.locator('#cancel-edit').click());await check('Cancel does not save edit',()=>page.locator('#valuation').innerText(),'1.10');
      await action(()=>page.locator('#search').fill(''));await action(()=>rows().filter({hasText:'Banana'}).getByRole('button',{name:/delete/i}).click());await check('Delete updates valuation',()=>page.locator('#valuation').innerText(),'0.50');await action(()=>page.reload());await check('Delete persists',()=>rows().count(),1);
    }else if(kind==='tasks'){
      const rows=()=>page.locator('#tasks > *').filter({has:page.getByRole('button',{name:/delete/i})});
      const add=(title,due,priority)=>action(async()=>{await page.locator('#task-title').fill(title);await page.locator('#due').fill(due);await page.locator('#priority').selectOption(priority);await page.locator('#add-task').click();});
      await check('Starts empty',()=>rows().count(),0);await add('Alpha','2026-01-01','Low');await add('Beta','2026-12-31','High');await check('Adds tasks',()=>rows().count(),2);await check('Initial active count',()=>page.locator('#active-count').innerText(),'2');
      await action(()=>rows().filter({hasText:'Alpha'}).getByRole('checkbox').check());await check('Completing updates active count',()=>page.locator('#active-count').innerText(),'1');await action(()=>page.locator('#filter').selectOption('Active'));await check('Active filter',()=>rows().count(),1);
      await action(()=>rows().filter({hasText:'Beta'}).getByRole('button',{name:/edit/i}).click());await add('Beta updated','2027-01-01','Low');await check('Editing does not create duplicate',()=>rows().count(),1);await check('Global active count while filtered',()=>page.locator('#active-count').innerText(),'1');
      await action(()=>page.reload());await action(()=>page.locator('#filter').selectOption('All'));await check('Both tasks survive reload',()=>rows().count(),2);await action(()=>rows().filter({hasText:'Beta updated'}).getByRole('button',{name:/edit/i}).click());await check('Calendar date retained',()=>page.locator('#due').inputValue(),'2027-01-01');await add('Beta updated','2027-01-01','Low');
      await add('  ','2027-01-01','Low');await check('Blank task rejected',()=>rows().count(),2);rejectWrite=true;await add('Rejected','2027-02-02','High');await check('Failed write retains confirmed list',()=>rows().count(),2);await check('Save error visible',async()=>/not saved|failed|error|could not|unable/i.test(await page.locator('body').innerText()),true);
      await action(()=>page.locator('#search').fill('Beta updated'));await check('Search selects edited task',()=>rows().count(),1);await action(()=>rows().first().getByRole('button',{name:/delete/i}).click());await check('Deleting active task updates overall count',()=>page.locator('#active-count').innerText(),'0');await action(()=>page.locator('#search').fill(''));await action(()=>page.reload());await action(()=>page.locator('#filter').selectOption('All'));await check('Deletion persists, completed task remains',()=>rows().count(),1);
    }else{
      await check('Counter starts at zero',()=>page.locator('#count').innerText(),'0');await action(()=>page.locator('#increment').click());await check('Increment still works',()=>page.locator('#count').innerText(),'1');await action(()=>page.reload());await check('Counter remains persistent',()=>page.locator('#count').innerText(),'1');await check('Original reset feature retained',()=>page.locator('#reset').count(),1);await action(()=>page.locator('#reset').click());await check('Reset still works',()=>page.locator('#count').innerText(),'0');
    }
    await page.setViewportSize({width:390,height:844});await check('No page overflow on mobile',()=>page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await check('No observed browser exceptions',async()=>errors.length,0);await page.screenshot({path:path.join(folder,name+'-mobile.png'),fullPage:true});
  }catch(e){checks.push({label:'Independent browser verification',passed:false,error:e.message.slice(0,500)});}finally{await context.close();}
  return {checks,passed:checks.filter(c=>c.passed).length,total:checks.length,allPassed:checks.length>0&&checks.every(c=>c.passed),browserErrors:errors};
}
try{
  const initial=await server.state();manifest.model=initial.openai.model;await save('manifest',manifest);
  console.log('Building real embedding index with the saved connection.');await server.post('knowledge/rebuild');await server.ready(120000);const knowledge=await(await fetch(server.origin+'/api/knowledge')).json();if(!knowledge.indexReady)throw new Error('Semantic index was not built; refusing to label the study hybrid.');await save('index',knowledge);
  for(const item of retrievalCases){const modes={};for(const mode of ['lexical','hybrid']){const {context}=await server.post('knowledge/search',{query:item.query,stack:item.stack,mode});if(mode==='hybrid'&&context.mode!=='hybrid'&&context.chunks.length)throw new Error('Hybrid lookup downgraded; stop comparison.');const ids=context.chunks.map(c=>c.id);modes[mode]={ids,hitAt3:item.expected?ids.slice(0,3).includes(item.expected):ids.length===0,hitAt6:item.expected?ids.includes(item.expected):ids.length===0,tokens:context.tokens,ms:context.durationMs,usage:context.usage,mode:context.mode};}retrieval.push({...item,modes});if(item.id%10===0){await save('retrieval',retrieval);console.log('Retrieval cases completed: '+item.id+'/40');}}
  await save('retrieval',retrieval);browser=await chromium.launch({headless:true});
  let trial=0;for(let rep=1;rep<=2;rep++)for(const item of generationCases)for(const mode of rep===1?['off','hybrid']:['hybrid','off']){
    const name=`generation-${++trial}-${item.id}-${mode}-r${rep}`,record={name,kind:'generation',case:item.id,mode,repetition:rep,startedAt:Date.now(),model:manifest.model};await save(name,record);
    console.log(name+': submitting one generation');await server.post('generate',{prompt:item.prompt,stack:'react-v2',knowledgeMode:mode});const final=await wait(name);record.generation=final.generation;record.orchestration=final.orchestration;record.engineQA=final.qa;record.finishedAt=Date.now();
    if(final.generation.status==='completed'){record.verification=await inspect(item.id,final.previewUrl,name);const files=await(await fetch(server.origin+'/api/current-files')).json();await save(name+'-files',files);}
    else record.verification={checks:[],passed:0,total:0,allPassed:false,error:final.generation.error};
    record.context=await(await fetch(server.origin+`/api/knowledge/context?project=${final.generation.projectId}&execution=${final.generation.id}`)).json();reports.push(record);await save(name,record);await save('results',reports);console.log(`${name}: ${record.verification.passed}/${record.verification.total} checks; completed=${record.generation.status}`);
    await server.post('stop');
  }
  for(const fault of ['missing-variable','early-render'])for(const mode of ['off','hybrid']){
    const name=`repair-${fault}-${mode}`,record={name,kind:'repair',case:fault,mode,startedAt:Date.now(),model:manifest.model};await save(name,record);
    const html='<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Persistent counter</title><h1>Persistent counter</h1><button id="increment" disabled>Increment</button><button id="reset" disabled>Reset</button><output id="count">0</output><script src="/__devkiller/db.js"></script><script src="app.js" defer></script></html>';
    const js=`let count=0; const output=document.querySelector('#count'); ${fault==='missing-variable'?"output.textContent = missingInitial;":"render();"}
const render=()=>{output.textContent=String(count);};
async function save(next){await DevKillerDB.set('counter',next);count=next;render();}
DevKillerDB.get('counter').then(value=>{count=value??0;render();document.querySelector('#increment').disabled=false;document.querySelector('#reset').disabled=false;});
document.querySelector('#increment').onclick=()=>save(count+1);document.querySelector('#reset').onclick=()=>save(0);`;
    await server.post('projects/new');await server.post('start',{files:[{name:'index.html',content:html},{name:'app.js',content:js}],stack:'static-v1'});
    const broken=await server.state();record.before=broken.qa;if(!broken.qa.some(q=>q.category==='funcional'&&q.status==='failed'))throw new Error('Repair fixture did not reproduce a real functional error.');
    await server.post('repair',{knowledgeMode:mode});const final=await wait(name);record.repair=final.repair;record.engineQA=final.qa;record.finishedAt=Date.now();record.verification=final.repair.status==='completed'?await inspect('repair',final.previewUrl,name):{checks:[],passed:0,total:0,allPassed:false,error:final.repair.result};await save(name+'-files',await(await fetch(server.origin+'/api/current-files')).json());reports.push(record);await save(name,record);await save('results',reports);console.log(`${name}: ${record.verification.passed}/${record.verification.total} checks; ${record.repair.status}`);await server.post('stop');
  }
}catch(error){await save('failure',{message:error.message,at:new Date().toISOString()});console.log('Study stopped without retry: '+error.message);process.exitCode=1;}
finally{
  manifest.finishedAt=new Date().toISOString();await save('manifest',manifest);await save('retrieval',retrieval);await save('results',reports);
  await browser?.close();await server.cleanup();
  const summary={folder,completedTrials:reports.length,model:manifest.model,retrieval:Object.fromEntries(['lexical','hybrid'].map(m=>[m,{cases:retrieval.length,hitAt3:retrieval.filter(r=>r.modes[m].hitAt3).length,hitAt6:retrieval.filter(r=>r.modes[m].hitAt6).length}])),generation:Object.fromEntries(['off','hybrid'].map(m=>[m,{trials:reports.filter(r=>r.kind==='generation'&&r.mode===m).length,fullyPassed:reports.filter(r=>r.kind==='generation'&&r.mode===m&&r.verification.allPassed).length,checksPassed:reports.filter(r=>r.kind==='generation'&&r.mode===m).reduce((n,r)=>n+r.verification.passed,0),checks:reports.filter(r=>r.kind==='generation'&&r.mode===m).reduce((n,r)=>n+r.verification.total,0)}])),usage:reports.reduce((s,r)=>{const u=(r.generation||r.repair)?.usage;return {input:s.input+(u?.input||0),output:s.output+(u?.output||0),unknown:s.unknown+(u?0:1)};},{input:0,output:0,unknown:0})};await save('summary',summary);console.log(JSON.stringify(summary));
}
