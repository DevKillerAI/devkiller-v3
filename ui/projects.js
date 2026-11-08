const $=id=>document.getElementById(id);
let selected=null,cache='',busy=false,perform,viewedFiles=[];
export function initProjects(action){
  perform=action;
  $('close-files').onclick=()=>{$('files-panel').hidden=true;};
  $('source-file').onchange=()=>{$('source-code').textContent=viewedFiles[Number($('source-file').value)]?.content||'';};
  $('download-source').onclick=()=>{const file=viewedFiles[Number($('source-file').value)];if(!file)return;const url=URL.createObjectURL(new Blob([file.content],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=file.name.split('/').pop();a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  $('refresh-projects').onclick=()=>refreshProjects(true);
  $('new-project').onclick=async()=>{const result=await perform('projects/new');if(result){selected=null;$('project-details').hidden=true;$('app-prompt').value='';location.hash='generator';$('app-prompt').focus();}await refreshProjects(true);};
  void refreshProjects();setInterval(()=>refreshProjects(),3000);
}
export function renderProjectState(state){
  busy=state.busy;
  $('project-save-status').textContent=state.storageError|| (state.project?`Saved on this PC · ${state.project.title} · version ${state.project.revision}`:'Each new app is saved automatically on this PC.');
  $('project-save-status').className=state.storageError?'error':'';
  $('new-project').disabled=busy;
  for(const button of document.querySelectorAll('#project-list button[data-mutates],#project-details button[data-mutates]'))button.disabled=busy;
}
async function refreshProjects(force=false){
  try{const r=await fetch('/api/projects');if(!r.ok)throw new Error();const data=await r.json(),key=JSON.stringify(data);
    if(!force&&key===cache)return;cache=key;
    $('project-list').replaceChildren();
    if(!data.projects.length)$('project-list').textContent='No saved apps yet. Describe your next project in the generator.';
    for(const p of data.projects){const article=document.createElement('article'),title=document.createElement('strong'),info=document.createElement('p'),open=document.createElement('button'),history=document.createElement('button');
      title.textContent=p.title;info.textContent=`Updated ${new Date(p.updatedAt).toLocaleString('en-US')}`;
      open.textContent='Open app';open.className='secondary';open.dataset.mutates='true';open.disabled=busy;open.onclick=async()=>{await perform('projects/open',{id:p.id});await showDetails(p.id);};
      history.textContent='Details and versions';history.className='text-button';history.onclick=()=>showDetails(p.id);
      article.append(title,info,open,history);$('project-list').append(article);
    }
    for(const error of data.errors){const p=document.createElement('p');p.textContent=error.message;$('project-list').append(p);}
    if(selected)await showDetails(selected);
  }catch{$('project-save-status').textContent='Could not read saved projects. Check the panel connection.';}
}
async function showDetails(id){
  selected=id;const r=await fetch('/api/projects/'+id);if(!r.ok)throw new Error('Project unavailable');const p=await r.json();
  const target=$('project-details');target.hidden=false;target.replaceChildren();
  const heading=document.createElement('h3');heading.textContent=p.title;target.append(heading);
  for(const text of [p.summary||'App saved on this computer.',p.prompt?`Original request: ${p.prompt}`:'Imported project with no generation request.',`Local database: ${p.databasePath}`,`${p.dataRecords} app data records. Restoring a version changes the code and keeps this data.`]){const paragraph=document.createElement('p');paragraph.textContent=text;target.append(paragraph);}
  for(const version of p.versions){const row=document.createElement('div'),label=document.createElement('span'),button=document.createElement('button'),files=document.createElement('button');row.className='saved-version';label.textContent=`Version ${version.id} · ${version.info.stack==='react-v5'?'React Complete':version.info.stack==='vue-v1'?'Vue':version.info.stack==='angular-v1'?'Angular':version.info.stack==='next-v1'?'Next.js':version.info.stack==='react-v4'?'React Pro':version.info.stack==='react-v3'?'React Studio':version.info.stack==='react-v2'?'React + icons and charts':version.info.stack==='react-v1'?'Basic React':'HTML/JS'} · ${new Date(version.created).toLocaleString('en-US')}`;button.textContent='Open this version';button.className='secondary';button.dataset.mutates='true';button.disabled=busy;button.onclick=()=>perform('projects/open',{id,version:version.id});files.textContent='View files';files.className='secondary';files.onclick=()=>showFiles(id,version.id);row.append(label,button,files);target.append(row);}
  for(const job of p.jobs){const d=document.createElement('details'),s=document.createElement('summary');s.textContent=`${job.type==='repair'?'Repair':'Generation'} · ${new Date(job.startedAt).toLocaleString('en-US')} · ${{completed:'completed',failed:'stopped with error',cancelled:'cancelled',interrupted:'interrupted at shutdown',running:'running','no-progress':'no change','not-fixed':'not repaired'}[job.status]||job.status}`;d.append(s);
    for(const text of [job.prompt,job.result||job.error||job.summary,job.model?`Model used: ${job.model}`:null,job.limits?`Attempt limits: ${job.limits.outputTokens==null?'provider-limited output':job.limits.outputTokens.toLocaleString('en-US')+' tokens output'}, ${job.limits.seconds} seconds, ${job.limits.calls} chamada.`:null,job.usage?`${job.usage.input} input tokens + ${job.usage.output} output`:job.called?'Usage not reported; charges may still apply.':'No AI call.'])if(text){const paragraph=document.createElement('p');paragraph.textContent=text;d.append(paragraph);}target.append(d);}
  for(const version of p.versions.filter(v=>v.info.qa?.length)){const d=document.createElement('details'),s=document.createElement('summary');s.textContent=`Checks for version ${version.id}`;d.append(s);for(const q of version.info.qa){const paragraph=document.createElement('p');paragraph.textContent=`${q.requirement} — Expected: ${q.expected} Evidence: ${q.evidence}`;d.append(paragraph);}target.append(d);}
}
async function showFiles(id,version){const response=await fetch(`/api/source?project=${encodeURIComponent(id)}&version=${version}`);if(!response.ok)return;const data=await response.json();viewedFiles=[...data.files.map(f=>({...f,label:'source/'+f.name})),...(data.artifact?.files||[]).map(f=>({...f,label:'preview/'+f.name})),...(data.environment?[{name:'environment.json',label:'environment.json',content:data.environment}]:[])];$('source-file').replaceChildren(...viewedFiles.map((file,index)=>{const option=document.createElement('option');option.value=index;option.textContent=file.label;return option;}));$('source-code').textContent=viewedFiles[0]?.content||'';$('source-folder').textContent='Folder on this PC: '+data.folder;$('files-panel').hidden=false;$('files-panel').scrollIntoView({behavior:'smooth',block:'start'});}
