import {initProjects,renderProjectState} from './projects.js';
import {initOrchestration,renderOrchestration} from './orchestration.js';
import {initKnowledge,renderKnowledge} from './knowledge.js';
const $ = id => document.getElementById(id);
let sourceStack='react-v5';
let files = [], token = '', currentVersion = null, pending = false, latest, closed = false, loadedGeneration=null,loadedRepair=null;
const labels = {stopped:'Stopped',preparing:'Preparing',building:'Building app',generating:'Generating with AI',starting:'Starting',checking:'Checking',verifying:'Checking in browser',degraded:'Opened with an error',running:'Available',failed:'Failed'};
function notice(message='') { $('notice').textContent = message; $('notice').hidden = !message; }
function describeFiles() { $('file-summary').textContent = `${files.length} files · ${(new Blob(files.map(f=>f.content)).size / 1024).toFixed(1)} KB · ${files.map(f=>f.name).join(', ')}`; }
async function example() {
  sourceStack='static-v1';
  try { const response = await fetch('/api/example'); if (!response.ok) throw new Error('Could not load the example.'); files = (await response.json()).files; $('source-title').textContent = 'Task list'; $('source-description').textContent = 'A sample app to test the basics: add, complete and delete tasks.'; describeFiles(); }
  catch(error) { notice(error.message); }
}
function render(s) {
  latest=s; if(s.token) token=s.token;
  renderProjectState(s);
  renderOrchestration(s);
  renderKnowledge(s);
  $('status').textContent=labels[s.status]; $('status').className=`status ${s.busy?'working':s.status}`;
  const busy=s.busy||pending;
  $('generation-model').textContent=s.openai?.model||'gpt-6-luna';
  $('live-code-panel').hidden=!s.liveCode;$('live-code').textContent=s.liveCode||'';
  $('build-progress').hidden=!s.preparation;
  if(s.preparation){const p=s.preparation;$('build-message').textContent=p.message;$('build-details').textContent=p.stack==='static-v1'?'HTML, CSS and JavaScript files':`${p.stack} · isolated build · ${p.limits?.seconds??60} seconds, ${p.limits?.memoryMB??512} MB, ${p.limits?.cpu??1} CPU`; }
  $('start').disabled=busy||!files.length; $('start').textContent=s.busy?'◌ Running…':s.active?'↑ Publish new version':'▶ Start app';
  $('restart').disabled=busy||!s.version; $('stop').disabled=busy||!s.active;
  $('example').disabled=busy; $('files').disabled=busy; $('folder').disabled=busy;$('environment').disabled=busy;
  $('shutdown').disabled=busy;
  $('verify-app').disabled=busy||!s.active;
  $('quality-summary').textContent=s.quality?.message||'Start an app to see its diagnostics.';
  if(s.repairTarget)$('quality-summary').textContent='The new attempt did not finish. The diagnostics below refer to that attempt’s code.';
  $('quality-summary').className=s.quality?.status||'';
  const failed=s.qa.filter(q=>q.status==='failed');
  $('quality-findings').replaceChildren(...failed.map(q=>{
    const article=document.createElement('article');article.className='finding';
    const title=document.createElement('h3');title.textContent=q.source==='model-proposed-scenario'?'Proposed scenario failed — review the requirement':q.category==='funcional'?'Functional issue detected':'Test environment issue';article.append(title);
    for(const [label,value] of [['What is missing',q.observed],['Requirement',q.requirement],['Expected',q.expected],['Evidence',q.evidence],['Next step',q.correction]])if(value){const p=document.createElement('p');const strong=document.createElement('strong');strong.textContent=label+': ';p.append(strong,document.createTextNode(value));article.append(p);}
    return article;
  }));
  const configured=!!s.openai?.configured;
  $('repair-app').disabled=busy||!configured||(!s.active&&!s.repairTarget)||!s.qa.some(q=>q.category==='funcional'&&q.status==='failed'&&q.source!=='model-proposed-scenario'&&!q.check?.startsWith('acceptance-'));
  $('repair-app').textContent=s.repairTarget?'Repair this attempt’s code':'Try a repair';
  $('comparison-actions').hidden=!s.comparison;
  if(s.comparison){$('open-comparison').href=s.comparison.url;$('open-comparison').textContent=s.comparison.kind==='previous'?'Open previous version ↗':'Open attempt separately ↗';}
  $('restore-version').hidden=s.comparison?.kind!=='previous';$('restore-version').disabled=busy;
  const repair=s.repair;$('repair-progress').hidden=!repair;
  if(repair){
    const messages={preparing:'Preparing a repair attempt…',retrieving:'Selecting references for the repair…',requesting:'The AI is reviewing the code and the error…',building:'Building the repaired code…',testing:'Checking the attempt in a separate preview…',completed:'Attempt finished.'};
    $('repair-status').textContent=repair.status==='completed'?'The detected issue did not appear in the new check.':messages[repair.stage];
    $('cancel-repair').hidden=repair.status!=='running'||!['preparing','retrieving','requesting'].includes(repair.stage);$('cancel-repair').disabled=pending;
    const elapsed=Math.floor(((repair.finishedAt||Date.now())-repair.startedAt)/1000);
    $('repair-metrics').textContent=`${elapsed}s · ${repair.characters.toLocaleString('en-US')} characters received`+(repair.usage?` · ${repair.usage.input.toLocaleString('en-US')} input tokens + ${repair.usage.output.toLocaleString('en-US')} output`:repair.finishedAt&&repair.called?' · The API did not report usage; charges may still apply.':'');
    $('repair-result').textContent=repair.result||'The current preview stays available during this attempt.';
    $('repair-context').textContent=repair.originalPromptAvailable?'The AI received the original request, current files and detected errors.':'The original request was not recorded for this version. The AI received the files and errors, with instructions to preserve the existing app.';
    $('repair-explanation').hidden=!repair.summary;$('repair-summary').textContent=repair.summary||'';
    $('repair-limitations').replaceChildren(...(repair.limitations||[]).map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
    if(repair.status==='completed'&&loadedRepair!==repair.id){loadedRepair=repair.id;void loadGeneratedFiles({title:repair.title});}
  }
  $('backend-key-status').textContent=configured?'OpenAI key securely saved':'Connect OpenAI in Connections';
  $('generate').disabled=busy||!configured;$('app-prompt').disabled=busy;
  const g=s.generation;
  $('generation-progress').hidden=!g;
  if(g) {
    const steps=['environment','retrieving','generating','building','deploying','completed'];
    const index=steps.indexOf(g.stage);
    const descriptions={planning:'Planning the complete experience and visual direction…','finding-images':'Selecting relevant photographs…','creating-editorial-image':'Creating one editorial image…','visual-review':'Reviewing the actual desktop and mobile design. Preview is available…',environment:'Checking the environment before calling the API…',retrieving:'Selecting and saving relevant knowledge…',generating:'OpenAI is writing your app…',building:'Building the application for the browser…',deploying:'Files received. Preparing and checking the preview…',completed:'Your app is available.',failed:'Generation stopped.',cancelled:'Generation cancelled.'};
    $('generation-status').textContent=g.stage==='completed'&&g.quality==='issues'?'Code generated. The preview opened with a functional issue.':g.stage==='completed'&&g.quality==='unverified'?'Code generated. The environment check was incomplete.':(g.stage==='generating'&&g.progressLabel?g.progressLabel:descriptions[g.stage]);
    $('request-details').hidden=!g.prompt;$('original-prompt').textContent=g.prompt||'';
    $('cancel-generation').hidden=g.status!=='running'||!['environment','retrieving','planning','generating','visual-review'].includes(g.stage);
    $('cancel-generation').disabled=pending;
    for(const step of document.querySelectorAll('[data-stage]')){const n=steps.indexOf(step.dataset.stage);step.classList.toggle('current',n===index);step.classList.toggle('done',index>n);}
    const elapsed=Math.max(0,Math.floor(((g.finishedAt||Date.now())-g.startedAt)/1000));
    const usage=g.usage?` · ${g.usage.input.toLocaleString('en-US')} input tokens + ${g.usage.output.toLocaleString('en-US')} output`:(g.called&&g.finishedAt?' · Usage not reported by the API; charges may still apply.':'');
    $('generation-metrics').textContent=`${elapsed}s · ${g.characters.toLocaleString('en-US')} characters received${usage}${g.productPlan?.usage?' · planning: '+g.productPlan.usage.total_tokens+' tokens':''}${g.visualReview?.usage?' · design review: '+g.visualReview.usage.total_tokens+' tokens':''}${g.media?.imageGeneration?' · image calls: '+g.media.imageGeneration.calls:''}`;
    const review=g.visualReview;$('visual-review-panel').hidden=!review;if(review){$('visual-review-status').textContent=review.status==='completed'?(review.review.verdict==='needs-work'?'Specific improvements were found. Your preview remains available.':'Ready for your visual review. This is not a guarantee of complete functionality.'):'The visual review could not finish. No automatic retry was made.';$('visual-review-findings').replaceChildren(...(review.review?.findings||[]).map(f=>{const li=document.createElement('li');li.textContent=f.category+': '+f.evidence+' '+f.action;return li;}));}
    $('generation-result').textContent=g.status==='completed'?`${g.title} — ${g.summary}`:'';
    $('generation-error').hidden=!g.error;$('generation-error').textContent=g.error||'';
    $('generation-limitations').replaceChildren(...(g.limitations||[]).map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
    if(g.status==='completed'&&loadedGeneration!==g.id){loadedGeneration=g.id;void loadGeneratedFiles(g);}
  }
  $('open').classList.toggle('disabled',!s.previewUrl); $('open').setAttribute('aria-disabled',String(!s.previewUrl));
  if(s.previewUrl) $('open').href=s.previewUrl; else $('open').removeAttribute('href');
  $('reload').disabled=!s.previewUrl;
  $('preview').hidden=!s.previewUrl; $('empty-preview').hidden=!!s.previewUrl;
  if(s.previewUrl && currentVersion!==s.active.version) { $('preview').src=s.previewUrl; currentVersion=s.active.version; }
  if(!s.previewUrl) { $('preview').removeAttribute('src'); currentVersion=null; }
  $('address').textContent=s.previewUrl||'Your app will appear here'; $('version').textContent=s.active?`v${s.active.version}`:'—';
  $('preview-caption').textContent=s.active?(s.quality?.status==='issues'?'Functional issue detected · see diagnostics':s.quality?.status==='checking'?'Preview available · checks running':'Preview available · see checks below'):'Waiting to run';
  $('remaining').textContent=s.expiresAt?`${Math.max(0,Math.ceil((s.expiresAt-Date.now())/60000))} MIN LEFT`:'ISOLATED WITH DOCKER';
  $('environment-state').textContent=s.environment?.message||'Environment not checked yet.';
  const eventKey=JSON.stringify(s.events);
  if($('events').dataset.key!==eventKey) {
    $('events').dataset.key=eventKey;
    $('events').replaceChildren(...s.events.map(e=>{ const li=document.createElement('li');li.className=e.kind;const time=document.createElement('time');time.textContent=new Date(e.time).toLocaleTimeString('en-US'); const text=document.createElement('span');text.textContent=e.message;li.append(time,text);return li;}));
  }
  if(s.qa.length) $('qa').replaceChildren(...s.qa.map(q=>{const article=document.createElement('article');const h=document.createElement('h4');h.textContent=`${({funcional:'functional',ambiente:'environment',visual:'visual'}[q.category]||q.category).toUpperCase()} · ${{passed:'Passed',failed:'Failed',pending:'Pending',info:'Suggestion'}[q.status]}`;article.append(h);if(q.status!=='passed'&&(q.source==='model-proposed-scenario'||q.check?.startsWith('acceptance-'))){const note=document.createElement('p');note.textContent='This AI-proposed test needs review. It cannot trigger a paid repair on its own.';article.append(note);}for(const [label,value] of [['Requirement',q.requirement],['Expected',q.expected],['Evidence',q.evidence]]){const p=document.createElement('p');const b=document.createElement('b');b.textContent=label+': ';p.append(b,document.createTextNode(value));article.append(p);}return article;}));
  $('diagnostic').textContent=s.lastError||'No issues recorded.';
}
async function refresh() { if(closed)return; try { const response=await fetch('/api/state'); if(!response.ok)throw new Error(); render(await response.json()); } catch { notice('Connection lost. Check that DevKiller is still running and reload this page.'); } }
async function loadGeneratedFiles(g) {
  try {const response=await fetch('/api/current-files');if(!response.ok)throw new Error();const data=await response.json();files=data.files;sourceStack=data.stack||'static-v1';$('source-title').textContent=g.title;$('source-description').textContent='Files used in the current preview.';describeFiles();}
  catch{notice('The app opened, but its file list could not be loaded. Reload the page.');}
}
async function action(name,payload={}) {
  pending=true; notice(); if(latest)render(latest);
  try {const response=await fetch(`/api/${name}`,{method:'POST',headers:{'Content-Type':'application/json','X-DevKiller-Token':token},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok)throw new Error(data.error);if(data.closed){closed=true;render({...latest,active:null,previewUrl:null,status:'stopped',expiresAt:null});for(const button of document.querySelectorAll('button,input,textarea'))button.disabled=true;notice('Panel stopped. You can close this tab. To return, open Iniciar.cmd.');return;}render(data);return data;}
  catch(error){notice(`${error.message}${latest?.active?' The last available preview is still accessible.':''}`);}
  finally{pending=false;await refresh();}
}
$('example').addEventListener('click',async()=>{await example();if(latest)render(latest);});
async function importFiles(e){
  const selected=[...e.target.files]; if(!selected.length)return;
  const paths=selected.map(f=>({file:f,name:f.webkitRelativePath?f.webkitRelativePath.split('/').slice(1).join('/'):f.name}));
  sourceStack=paths.some(f=>/app\/page\.[jt]sx$/.test(f.name))?'next-v1':selected.some(f=>f.name==='App.vue')?'vue-v1':selected.some(f=>f.name==='app.component.ts')?'angular-v1':selected.some(f=>/^App\.[jt]sx$/.test(f.name))?'react-v5':'static-v1';
  const compiled=sourceStack!=='static-v1',hasSrc=paths.some(f=>f.name.startsWith('src/'));const source=compiled&&hasSrc?paths.filter(f=>f.name.startsWith('src/')):paths;
  const maxFiles=compiled?160:80,maxMB=compiled?4:2;if(source.length>maxFiles||source.reduce((n,f)=>n+f.file.size,0)>maxMB*1024*1024){notice('Select up to '+maxFiles+' source files, totalling no more than '+maxMB+' MB.');e.target.value='';return;}
  files=await Promise.all(source.map(async f=>({name:compiled&&!f.name.startsWith('src/')?'src/'+f.name:f.name,content:await f.file.text()})));
  $('source-title').textContent='Your app';$('source-description').textContent='Files selected. Start or publish a new version to open the result.';describeFiles();notice();if(latest)render(latest);
}
$('files').addEventListener('change',importFiles);$('folder').addEventListener('change',importFiles);
$('start').addEventListener('click',()=>action('start',{files,stack:sourceStack}));
$('restart').addEventListener('click',()=>action('restart'));
$('stop').addEventListener('click',()=>action('stop'));
$('environment').addEventListener('click',()=>action('environment'));
$('verify-app').addEventListener('click',()=>action('qa'));
$('repair-app').addEventListener('click',()=>action('repair'));
$('cancel-repair').addEventListener('click',()=>action('repair/cancel'));
$('restore-version').addEventListener('click',async()=>{const result=await action('restore');if(result)await loadGeneratedFiles({title:'Restored version'});});
$('shutdown').addEventListener('click',()=>action('shutdown'));
$('generate').addEventListener('click',()=>action('generate',{prompt:$('app-prompt').value,generateEditorialImage:$('editorial-image').checked,reviewDesign:true,professionalDelivery:$('professional-delivery').checked}));
$('cancel-generation').addEventListener('click',()=>action('generation/cancel'));
$('reload').addEventListener('click',()=>{$('preview').src=latest.previewUrl;});
initProjects(async(name,payload)=>{const result=await action(name,payload);if(result?.project)await loadGeneratedFiles({title:result.project.title});else if(result&&name==='projects/new'){files=[];describeFiles();$('source-title').textContent='New app';$('source-description').textContent='Describe the app above or import its files.';}return result;});
initOrchestration(action);
initKnowledge();
describeFiles();$('source-title').textContent='New app';$('source-description').textContent='Describe the app above or import its files.';
await refresh(); if(latest?.active&&!latest.generation)await loadGeneratedFiles({title:latest.project?.title||'Current app'});setInterval(refresh,1000);

