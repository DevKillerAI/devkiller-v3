// Compiles the exact authored RAG snippets; no model call or user project access.
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {AppCompiler} from '../modules/compiler.mjs';
import {DockerRuntime} from '../modules/docker.mjs';
import {ProjectStore} from '../modules/projects.mjs';
import {serveAppData} from '../modules/app-data.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const directory=await fs.mkdtemp(path.join(root,'.runtime','design-example-'));
const evidence=path.join(root,'validation','design-v4');await fs.mkdir(evidence,{recursive:true});
const read=id=>fs.readFile(path.join(root,'knowledge','design-v4',id+'.md'),'utf8');
const snippet=(text,language)=>text.split('```'+language+'\n')[1].split('```')[0];
const menu=snippet(await read('D02'),'jsx'),art=snippet(await read('D04'),'jsx'),cardCSS=snippet(await read('D03'),'css');
const source=`import {useState,useEffect,useId,useRef} from 'react';
${menu}
${art}
export default function App(){
  const [value,setValue]=useState('all'),[details,setDetails]=useState(null),[draft,setDraft]=useState(''),[saved,setSaved]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[count,setCount]=useState(0);
  useEffect(()=>{window.DevKillerDB.get('details').then(d=>{const next=d??{name:'Solstice',venue:null};setDetails(next);setDraft(next.venue??'')}).catch(()=>setError('Could not load details.'))},[]);
  async function save(e){e.preventDefault();if(busy)return;setBusy(true);setSaved(false);setError('');try{const next={...details,venue:draft.trim()||null};await window.DevKillerDB.set('details',next);setDetails(next);setSaved(true)}catch{setError('Not saved. Previous details were kept.')}finally{setBusy(false)}}
  return <main><p>DEVKILLER · REFERENCE VERIFICATION</p><section className="hero"><div><h1>Shape the<br/>unexpected.</h1><p>Original SVG and themed controls.<br/>An authored reference, not an AI-generated app.</p></div><RibbonArt/></section>
    <Filter label="Genre" options={[{id:'all',label:'All genres'},{id:'ambient',label:'Ambient'},{id:'electronic',label:'Electronic'}]} value={value} onChange={setValue}/>
    <p id="selection">{value}</p><div className="cards"><article className="card"><header className="card-head"><p className="card-meta">WAREHOUSE · EXPERIMENTAL ELECTRONIC AND CONTEMPORARY INDEPENDENT MUSIC</p><button className="card-action" aria-label="Add artist" onClick={()=>setCount(count+1)}>+</button></header><h2>Ava Meridian</h2><p id="added">Added: {count}</p></article></div>
    <section><h2>{details?.name??'Loading'}</h2><p id="venue">{details?.venue||'To be defined'}</p><form onSubmit={save}><label>Venue<input value={draft} onChange={e=>setDraft(e.target.value)} disabled={!details||busy}/></label><button disabled={!details||busy}>Save details</button></form><p role="status">{saved?'Saved':error}</p></section><div className="small-art"><RibbonArt/></div>
  </main>;
}`;
const css=`${cardCSS}
:root{color-scheme:dark;--surface:#191d2a;--accent:#cdf861;--secondary:#9580ff;--shadow:#080b14;color:#f4f1e9;background:#0e111a;font:16px/1.6 system-ui}
*{box-sizing:border-box}body{margin:0}main{max-width:1100px;margin:auto;padding:clamp(16px,4vw,56px)}h1{font-size:clamp(42px,7vw,84px);line-height:1.03;letter-spacing:-.055em}h2{font-size:28px}.hero{display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:20px}.hero-art{width:100%;height:auto;display:block;pointer-events:none}.small-art{width:120px}button,input{font:inherit}button{background:var(--surface);color:inherit;border:1px solid #515766;border-radius:12px;min-height:44px;padding:10px 16px;cursor:pointer}button:hover{border-color:var(--accent)}input{padding:10px;border:1px solid #515766;border-radius:8px;background:var(--surface);color:inherit;max-width:100%}input:focus-visible{outline:2px solid var(--accent)}button:disabled{opacity:.5}.filter{max-width:360px}.filter>button{width:100%;display:flex;justify-content:space-between}.filter-panel{background:var(--surface);color:#f4f1e9;border:1px solid #515766;border-radius:14px;padding:12px;margin-top:8px;max-height:280px;overflow:auto;box-shadow:0 12px 40px #0006}.filter-panel fieldset{border:0;margin:0;padding:0}.filter-panel legend{font-size:12px;color:#c7cbd9}.filter-option{display:flex;gap:12px;padding:10px;border-radius:8px;cursor:pointer}.filter-option:has(input:checked){background:#cdf861;color:#131820}.filter-option:focus-within{outline:2px solid #9580ff}.filter-option input{accent-color:#202d08}.card{background:var(--surface);border:1px solid #515766;border-radius:18px}.card-meta{font-size:13px;color:var(--accent)}form{display:flex;flex-wrap:wrap;align-items:end;gap:12px}form label{display:grid;gap:4px;max-width:100%}section{margin-bottom:30px}@media(max-width:600px){.hero{grid-template-columns:1fr}.hero-art{max-width:350px;margin:auto}}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}`;
await fs.writeFile(path.join(directory,'App.jsx'),source);await fs.writeFile(path.join(directory,'styles.css'),css);
const runtime=new DockerRuntime(root,'design-reference-verification');
const build=await new AppCompiler(runtime).prepare([{name:'src/App.jsx',content:source},{name:'src/styles.css',content:css}],{stack:'react-v2'});
const assets=new Map(build.files.map(f=>['/'+f.name,f.content]));
const store=new ProjectStore(path.join(directory,'projects'));const project=store.create({prompt:'Isolated authored design reference'});
let origin,failSave=false;
const server=http.createServer(async(req,res)=>{
  if(failSave&&req.method==='PUT'){res.writeHead(503,{'Content-Type':'application/json'});res.end('{"error":"Simulated unavailable storage"}');return;}
  if(await serveAppData(req,res,{origin,store,projectId:project.id}))return;
  const p=req.url==='/'?'/index.html':req.url,body=assets.get(p);res.writeHead(body?200:404,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html'});res.end(body||'Not found');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const checks=[];
try{
  await page.goto(origin);await page.getByRole('heading',{name:'Solstice',exact:true}).waitFor();
  assert.equal(await page.locator('#venue').innerText(),'To be defined');checks.push('Missing venue renders honestly; supplied name preserved');
  await page.getByLabel('Venue',{exact:true}).fill('Aurora Hall');await page.getByRole('button',{name:'Save details'}).click();await page.getByRole('status').filter({hasText:'Saved'}).waitFor();
  assert.equal(store.data(project.id,'GET','details').venue,'Aurora Hall');await page.reload();await page.getByRole('heading',{name:'Solstice',exact:true}).waitFor();assert.equal(await page.locator('#venue').innerText(),'Aurora Hall');checks.push('Editor → real DevKiller data API → SQLite → reload preserves details');
  failSave=true;await page.getByLabel('Venue',{exact:true}).fill('Should not persist');await page.getByRole('button',{name:'Save details'}).click();await page.getByRole('status').filter({hasText:'Not saved.'}).waitFor();assert.equal(store.data(project.id,'GET','details').venue,'Aurora Hall');failSave=false;checks.push('Failed write is visible and preserves previous data');
  const trigger=page.getByRole('button',{name:/Genre:/});await trigger.click();await page.keyboard.press('Tab');await page.keyboard.press('ArrowDown');assert.equal(await page.getByRole('radio',{name:'Ambient',exact:true}).isChecked(),true);assert.equal(await trigger.getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');assert.equal(await trigger.getAttribute('aria-expanded'),'false');assert.equal(await trigger.evaluate(e=>document.activeElement===e),true);checks.push('Keyboard Tab/arrows/Escape and focus restoration');
  await trigger.click();await page.getByRole('radio',{name:'Electronic',exact:true}).check();await page.getByRole('button',{name:'Done',exact:true}).click();assert.equal(await page.locator('#selection').innerText(),'electronic');checks.push('Styled option selection updates state');
  await trigger.click();await page.getByRole('heading',{name:'Ava Meridian'}).click();assert.equal(await trigger.getAttribute('aria-expanded'),'false');checks.push('Click outside closes panel');
  await page.getByRole('button',{name:'Add artist',exact:true}).click();assert.equal(await page.locator('#added').innerText(),'Added: 1');
  for(const width of [1440,768,391,320]){
    await page.setViewportSize({width,height:1000});await trigger.click();
    const bounds=await page.evaluate(()=>{
      const a=document.querySelector('.card-meta').getBoundingClientRect(),b=document.querySelector('.card-action').getBoundingClientRect(),p=document.querySelector('.filter-panel').getBoundingClientRect();
      return {overlap:a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top,overflow:document.documentElement.scrollWidth>innerWidth,panelOutside:p.left<0||p.right>innerWidth};
    });assert.deepEqual(bounds,{overlap:false,overflow:false,panelOutside:false});
    if(width===1440||width===391)await page.screenshot({path:path.join(evidence,'reference-'+width+'.png'),fullPage:true});await page.keyboard.press('Escape');
  }checks.push('No label/button overlap or horizontal overflow at 1440, 768, 391, 320px');
  const ids=await page.locator('linearGradient').evaluateAll(es=>es.map(e=>e.id));assert.equal(new Set(ids).size,2);assert.deepEqual(errors,[]);checks.push('Two SVG instances have unique gradient IDs; no browser JS errors');
  const report={at:new Date().toISOString(),status:'passed',checks,compiler:build.compiler,generatedBy:'authored snippets extracted from RAG documents',paidGenerationCalls:0,screenReaderAudit:false};await fs.writeFile(path.join(evidence,'examples.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
