const $=id=>document.getElementById(id),fmt=n=>n==null?'—':Number(n).toLocaleString('en-US'),gb=n=>n==null?'—':(n/1024**3).toLocaleString('en-US',{maximumFractionDigits:1})+' GB';
let reading=false,last=null,history=[],ragReading=false,ragReadAt=null;
function navigate(){
 const hash=location.hash,hood=hash==='#under-the-hood';$('hood-view').hidden=!hood;$('generator-view').hidden=hood;
 $('view-title').textContent=hood?'UNDER THE HOOD':hash==='#projects'?'APP LIBRARY':'CREATE STUDIO';
 for(const a of document.querySelectorAll('[data-nav]')){const selected=a.dataset.nav===(hood?'hood':hash==='#projects'?'projects':'generator');a.classList.toggle('selected',selected);if(selected)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
 if(hash==='#projects')requestAnimationFrame(()=>$('projects').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}));else scrollTo(0,0);
 if(hood)void readHealth();
}
const statusNames={ready:'Ready',configured:'Key saved',warning:'Attention',blocked:'Unavailable'};
const stageNames={stopped:'Idle · no task running',running:'App running',degraded:'Preview open with limitations',preparing:'Checking environment',generating:'AI is creating the app',building:'Building received code',starting:'Opening app',checking:'Checking result',verifying:'Checking in browser',failed:'Last attempt stopped'};
function renderHealth(data){
 const {machine:m,storage:s,capacity:c}=data;last=data;
 $('engine-alert').hidden=true;$('panel-connection').textContent='Engine connected';$('engine-live').textContent='● LIVE READINGS';$('engine-live').classList.remove('offline');
 $('engine-health').textContent=data.ready?'Ready to create':data.status==='blocked'?'Needs setup':'Needs attention';$('engine-health').dataset.health=data.status;
 $('engine-health-detail').textContent=data.ready?'Infrastructure ready':data.status==='blocked'?'See inspection below':'See what needs attention';
 $('engine-projects').textContent=fmt(s.projects);$('engine-versions').textContent=`${fmt(s.versions)} ${s.versions===1?'version':'versions'} · ${fmt(s.records)} data ${s.records===1?'record':'records'}`;
 $('engine-tokens').textContent=fmt(s.inputTokens+s.outputTokens);$('engine-usage-note').textContent=s.unknownUsage?`Tokens · ${s.unknownUsage} call(s) without reported usage`:`Tokens · ${fmt(s.jobs)} ${s.jobs===1?'attempt':'attempts'}`;
 const minutes=Math.floor(m.uptimeSeconds/60);$('engine-uptime').textContent=minutes<60?`${minutes} min`:`${Math.floor(minutes/60)}h ${minutes%60}m`;
 $('engine-session').textContent=data.activity.previewActive?'1 app running':'No app running';
 document.querySelector('.motor-map').classList.toggle('working',data.activity.busy);
 $('engine-stage').textContent=stageNames[data.activity.stage]||'Checking activity';$('engine-sampled').textContent='READING '+new Date(data.sampledAt).toLocaleTimeString('en-US');
 const memory=100*m.memoryUsed/m.memoryTotal,cpu=m.cpuPercent;
 $('cpu-value').textContent=cpu==null?'—':Math.round(cpu)+'%';$('memory-value').textContent=Math.round(memory)+'%';
 $('cpu-ring').setAttribute('stroke-dasharray',`${cpu??0} 100`);$('memory-ring').setAttribute('stroke-dasharray',`${memory} 100`);
 $('cpu-caption').textContent=`${m.cores} logical processors`;$('memory-caption').textContent=`${gb(m.memoryUsed)} of ${gb(m.memoryTotal)}`;
 $('process-memory').textContent=Math.round(m.processMemory/1024**2)+' MB';$('disk-free').textContent=gb(m.disk?.freeBytes);
 $('cpu-latest').textContent=cpu==null?'Collecting':Math.round(cpu)+'% now';
 if(cpu!=null&&history.at(-1)?.time!==data.sampledAt){history.push({time:data.sampledAt,value:cpu});history=history.slice(-30);}
 $('cpu-line').setAttribute('points',history.length>1?history.map((p,i)=>`${i/(history.length-1)*300},${43-p.value*.4}`).join(' '):'');
 $('history-caption').textContent=history.length>1?`${history.length} real samples · resets when the page reloads`:'Collecting first samples…';
 $('limit-output').textContent=c.generation.outputTokens==null?'Provider limit only':fmt(c.generation.outputTokens)+' tokens';$('limit-time').textContent=c.generation.seconds+' seconds';$('limit-calls').textContent=c.generation.calls==null?'Saved stages · manual cancellation':c.generation.calls+' call per click';$('limit-data').textContent=c.data.totalMB+' MB';
 const technical=$('technical-capacity');technical.replaceChildren(...[`Design guidance: Taste ${c.designAssistance?.enabled?'enabled':'off'} · complements Product Design and RAG · no additional AI calls.`,...(c.frameworks||[]).map(p=>`${p.label}: ${p.ready?'Installed':'Needs setup'}`),`Build: ${c.build.memoryMB} MB memory, ${c.build.cpu} CPU, up to ${c.build.seconds} s.`,`Preview: ${c.preview.memoryMB} MB, ${c.preview.cpu.toLocaleString('en-US')} CPU, ${c.preview.minutes} minutes per run; ${c.preview.concurrent} active app per worker.`,c.backend||'Backend setup status unavailable.',`PostgreSQL: ${c.preview.databaseMemoryMB||384} MB per active project database; no database port exposed.`,`Source: legacy profiles ${c.files.count} files / ${c.files.totalMB} MB; extended profiles 160 files / 4 MB.`,`Legacy SQLite adapter: ${fmt(c.data.recordsPerApp)} records per app; ${c.data.recordKB} KB per record.`,`Model: ${c.model}. Local compilation without network access.`].map(t=>{const p=document.createElement('p');p.textContent=t;return p;}));
 $('inspection-count').textContent=data.components.filter(x=>['ready','configured'].includes(x.status)).length+' / 4';
 $('engine-checks').replaceChildren(...data.components.map(component=>{
   const node=$('node-'+component.id);node.textContent=statusNames[component.status];node.dataset.state=component.status;
   const row=document.createElement('article');row.className='check-row';const icon=document.createElement('span');icon.className='check-icon '+component.status;icon.textContent=['ready','configured'].includes(component.status)?'✓':'!';
   const body=document.createElement('div'),heading=document.createElement('h3'),note=document.createElement('p');heading.textContent=component.name;note.textContent=component.detail;body.append(heading,note);row.append(icon,body);return row;
 }));
 const jobs=$('engine-jobs');jobs.replaceChildren();if(!s.recent.length){const p=document.createElement('p');p.className='empty-history';p.textContent='Your first request starts the history. Saved attempts will appear here.';jobs.append(p);}else for(const job of s.recent){const row=document.createElement('div');row.className='job-row';const status={completed:'Completed',failed:'Interrupted',cancelled:'Cancelled',running:'Running',interrupted:'Interrupted','not-fixed':'Issue persisted','no-progress':'No change'}[job.status]||'Recorded';for(const value of [job.type==='repair'?'↻ Repair':'✧ Generation',new Date(job.startedAt).toLocaleString('en-US'),status,!job.called?'No AI call':job.outputTokens==null?'Usage not reported':fmt(job.outputTokens)+' tokens output']){const span=document.createElement('span');span.textContent=value;row.append(span);}jobs.append(row);}
}
async function readHealth(fresh=false){
 if(location.hash==='#under-the-hood')void readRag();
 if(reading)return;reading=true;$('scan-engine').disabled=true;$('scan-engine').classList.add('scanning');
 try{const response=await fetch('/api/engine'+(fresh?'?fresh=1':''),{signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error();renderHealth(await response.json());}
 catch{$('engine-alert').hidden=false;$('engine-alert').textContent=last?'Connection lost. The indicators below show the last reading at '+new Date(last.sampledAt).toLocaleTimeString('en-US')+'.':'Could not reach the Engine. Check that it is running and refresh the readings.';$('panel-connection').textContent='Disconnected';$('engine-live').textContent='READINGS UNAVAILABLE';$('engine-live').classList.add('offline');$('engine-health').textContent='No current reading';$('engine-health').dataset.health='attention';}
 finally{reading=false;$('scan-engine').disabled=false;$('scan-engine').classList.remove('scanning');}
}
async function readRag(){
 if(ragReading)return;ragReading=true;
 try{
  const responses=await Promise.all([fetch('/api/knowledge',{signal:AbortSignal.timeout(10000)}),fetch('/api/executions',{signal:AbortSignal.timeout(10000)})]);
  if(responses.some(r=>!r.ok))throw new Error('RAG readings unavailable');
  const [knowledge,{executions}]=await Promise.all(responses.map(r=>r.json()));
  if(!knowledge.ready||!Array.isArray(knowledge.sources)||!Array.isArray(executions))throw new Error('RAG readings unavailable');
  const enabled=knowledge.mode!=='off',mode={anythingllm:'AnythingLLM',hybrid:'Hybrid',lexical:'Text retrieval',off:'Off'}[knowledge.mode]||knowledge.mode;
  const lookups=executions.filter(r=>r.knowledge&&r.knowledge.requestedMode!=='off').sort((a,b)=>b.createdAt-a.createdAt);
  const badge=$('hood-rag-badge');badge.textContent=enabled?'RAG ENABLED':'RAG OFF';badge.classList.toggle('offline',!enabled);
  const checked=knowledge.connection?.checkedAt;
  $('hood-rag-summary').textContent=`${mode} · ${enabled?'Selected for new requests.':'New requests use no RAG.'} `+(knowledge.mode==='anythingllm'?(checked?`Last connection check: ${knowledge.connection.ok?'passed':'unavailable'} · ${new Date(checked).toLocaleString('en-US')}. Checked again before generation.`:'Connection will be checked before generation.'):'Existing executions retain their saved context.');
  if(knowledge.mode==='anythingllm'&&knowledge.connection?.ok===false){badge.textContent='ENABLED · CHECK CONNECTION';badge.classList.add('offline');}
  $('hood-rag-sources').textContent=`${fmt(knowledge.sources.filter(s=>s.enabled).length)} / ${fmt(knowledge.sources.length)}`;
  $('hood-rag-library').textContent=knowledge.workspace||'Curated local catalog';
  $('hood-rag-queries').textContent=fmt(lookups.length);
  $('hood-rag-references').textContent=fmt(lookups.reduce((n,r)=>n+(r.knowledge.chunks?.length||0),0));
  const timings=lookups.map(r=>r.knowledge.durationMs).filter(n=>Number.isFinite(n)&&n>=0);
  $('hood-rag-latency').textContent=timings.length?fmt(Math.round(timings.reduce((n,v)=>n+v,0)/timings.length))+' ms':'—';
  $('hood-rag-limits').textContent=`Up to ${knowledge.limits.results} references · ${fmt(knowledge.limits.contextTokens)} context tokens. `+(knowledge.mode==='anythingllm'?'Unavailable or empty retrieval stops generation before the model call.':'Current retrieval mode: '+mode+'.');
  const latest=lookups[0],tags=$('hood-rag-latest-sources');tags.replaceChildren();
  $('hood-rag-latest-title').textContent=latest?latest.prompt:'No saved generation lookup yet';
  $('hood-rag-latest-detail').textContent=latest?`${new Date(latest.createdAt).toLocaleString('en-US')} · ${latest.knowledge.mode} · ${latest.knowledge.chunks.length} references · ${fmt(latest.knowledge.tokens)} tokens · ${fmt(latest.knowledge.durationMs)} ms. Generation status: ${latest.status}.`:'Create an app with RAG enabled to record its query and selected references.';
  for(const source of latest?.knowledge.chunks||[]){const tag=document.createElement('span');tag.textContent=source.id;tag.title=source.title;tags.append(tag);}
  const historyRoot=$('hood-rag-history');historyRoot.replaceChildren();
  if(!lookups.length){const p=document.createElement('p');p.textContent='No saved generation queries.';historyRoot.append(p);}
  for(const run of lookups.slice(0,6)){
   const article=document.createElement('article'),heading=document.createElement('h4'),details=document.createElement('p'),sources=document.createElement('p');
   article.className='rag-query';heading.textContent=run.prompt;
   details.textContent=`${new Date(run.createdAt).toLocaleString('en-US')} · ${run.knowledge.mode} · ${fmt(run.knowledge.tokens)} tokens · ${fmt(run.knowledge.durationMs)} ms · ${run.status}`;
   sources.textContent=run.knowledge.chunks.length?run.knowledge.chunks.map(s=>s.title).join(' · '):'No references returned.';
   article.append(heading,details,sources);historyRoot.append(article);
  }
  ragReadAt=new Date();
 }catch{
  $('hood-rag-badge').textContent='READING UNAVAILABLE';$('hood-rag-badge').classList.add('offline');
  $('hood-rag-summary').textContent=ragReadAt?`Could not refresh RAG. Values below are the previous reading from ${ragReadAt.toLocaleTimeString('en-US')}.`:'Could not read RAG status. Refresh readings to try again.';
 }finally{ragReading=false;}
}
window.addEventListener('hashchange',navigate);$('scan-engine').onclick=()=>readHealth(true);navigate();void readHealth();setInterval(()=>{if(!document.hidden)void readHealth();},5000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)void readHealth();});
