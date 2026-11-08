const $=id=>document.getElementById(id);
let token='',busy=false,pending=false,status=null,lastSourceSignature='',repairContext=null,run=null,modeDirty=false;
const names={off:'Off · original generation',anythingllm:'AnythingLLM · Biblioteca DevKiller',lexical:'Text retrieval',hybrid:'Hybrid retrieval','lexical-fallback':'Text fallback',empty:'No matching references'};
export function initKnowledge(){
  $('knowledge-mode').onchange=()=>{modeDirty=true;};
  $('knowledge-save').onclick=()=>request('settings',{mode:$('knowledge-mode').value});
  $('knowledge-build').onclick=()=>request('rebuild');
  $('knowledge-cancel').onclick=()=>request('cancel');
  $('knowledge-search').onclick=async()=>{const data=await request('search',{query:$('knowledge-query').value,stack:$('knowledge-stack').value,mode:$('knowledge-mode').value});if(data?.context)showContext(data.context);};
  $('knowledge-used').onclick=async()=>{try{if(repairContext){showContext(repairContext);return;}if(!run)return;const response=await fetch(`/api/knowledge/context?project=${encodeURIComponent(run.projectId)}&execution=${encodeURIComponent(run.id)}`);if(!response.ok)throw new Error('Could not read the saved context.');showContext((await response.json()).context);}catch(e){message(e.message);}};
  void refresh();setInterval(refresh,4000);
}
export function renderKnowledge(state){token=state.token||token;busy=state.busy;run=state.orchestration||null;
  repairContext=state.repair?.knowledgeContext||null;const context=repairContext||run?.knowledge;
  $('knowledge-last').textContent=context?`${names[context.mode]||context.mode} · ${context.chunks.length} references · ${context.tokens} context tokens · ${context.mode==='anythingllm'?`${context.usage.retrievalCalls} consulta ao AnythingLLM`:`${context.usage.embeddingCalls} embedding calls`}. ${context.reason}${context.stages?' Stage contexts: '+Object.keys(context.stages).join(', ')+'.':''}`:'Each generation records its chosen references before calling the model.';
  $('knowledge-used').hidden=!context;$('knowledge-used').disabled=busy||pending;
  controls();
}
function controls(){for(const id of ['knowledge-save','knowledge-build','knowledge-search','knowledge-mode','knowledge-query','knowledge-stack'])$(id).disabled=busy||pending||!status?.ready;for(const box of $('knowledge-sources').querySelectorAll('input'))box.disabled=busy||pending;$('knowledge-cancel').hidden=!status?.busy;if(status?.mode==='anythingllm')$('knowledge-build').disabled=true;}
function message(text){$('knowledge-message').textContent=text;$('knowledge-message').hidden=!text;}
async function request(route,data={}){pending=true;controls();message('');try{const response=await fetch('/api/knowledge/'+route,{method:'POST',headers:{'Content-Type':'application/json','X-DevKiller-Token':token},body:JSON.stringify(data)});const result=await response.json();if(!response.ok)throw new Error(result.error||'Knowledge operation failed.');if(route==='settings'){modeDirty=false;message('Saved. New requests use this mode; saved executions keep their original context.');}else if(route==='rebuild')message('Indexing started. This may use paid embeddings; progress appears below.');await refresh();return result;}catch(e){message(e.message);if(route==='source'){lastSourceSignature='';await refresh();}return null;}finally{pending=false;controls();}}
async function refresh(){try{const response=await fetch('/api/knowledge');if(!response.ok)throw new Error('Knowledge status could not be refreshed.');status=await response.json();
  $('knowledge-status').textContent=status.error||`${names[status.mode]} · ${status.sources.filter(s=>s.enabled).length}/${status.sources.length} curated sources · ${status.mode==='anythingllm'?(status.connection?.ok?'Conexão verificada':'Conexão pendente ou indisponível; verificada antes de cada geração'):(status.indexReady?'Semantic index ready':'Semantic index not built; hybrid requests use text fallback')}`;
    if(document.activeElement!==$('knowledge-mode')&&!pending&&!modeDirty)$('knowledge-mode').value=status.mode;
  const build=status.lastBuild;$('knowledge-index').textContent=status.busy?'Building the semantic index…':build?`${build.status==='completed'?'Last index completed':'Last index failed'} · ${build.embeddingCalls} embedding calls · ${build.embeddingTokens} reported tokens${build.reused!==undefined?` · ${build.reused} cached documents reused`:''}`:'No semantic index built yet. Source catalog and text search are ready without API calls.';
  $('knowledge-cost').textContent=status.usage?`Recorded embeddings: ${status.usage.calls} calls · ${status.usage.tokens} reported tokens · ${status.usage.unknownCalls||0} calls with unconfirmed usage. Generation tokens are reported separately.`:'';
  if(status.mode==='anythingllm'){$('knowledge-index').textContent='AnythingLLM manages the index. Up to 6 references / 4,000 tokens per stage. '+(status.stageRouting?status.stageRouting.documents+' specialist documents across 5 collections. Core retrieval is required; specialist outages are reported.':'Core library active.');$('knowledge-cost').textContent='A busca usa o AnythingLLM local, que não informa o consumo de embeddings nesta API. Os trechos selecionados entram no consumo de entrada da geração OpenAI.';}
  const signature=JSON.stringify(status.sources);if(signature!==lastSourceSignature){lastSourceSignature=signature;$('knowledge-sources').replaceChildren();for(const source of status.sources||[]){const label=document.createElement('label'),box=document.createElement('input'),text=document.createElement('span');box.type='checkbox';box.checked=source.enabled;box.setAttribute('aria-label','Enable '+source.title);box.onchange=()=>request('source',{id:source.id,enabled:box.checked});text.textContent=`${source.title} · ${source.stacks.join(', ')}`;label.append(box,text);$('knowledge-sources').append(label);}}
  controls();
}catch(e){message(e.message);}}
function showContext(context){const root=$('knowledge-results');root.replaceChildren();if(!context){root.textContent='No saved knowledge context.';return;}
  const summary=document.createElement('p');summary.textContent=`${names[context.mode]||context.mode} · ${context.tokens} tokens · ${context.durationMs} ms. ${context.reason}`;root.append(summary);
  for(const chunk of context.chunks){const details=document.createElement('details'),title=document.createElement('summary'),meta=document.createElement('p'),body=document.createElement('pre');title.textContent=chunk.title;meta.textContent=`${chunk.source} · ${chunk.methods.join(' + ')} · SHA-256 ${chunk.hash}`;body.textContent=chunk.content;details.append(title,meta,body);root.append(details);}
  for(const [stage,c] of Object.entries(context.stages||{})){
    const section=document.createElement('details'),heading=document.createElement('summary');
    heading.textContent=`${stage} · ${c.tokens} tokens · ${c.specialistReferences} specialist references`;section.append(heading);
    for(const chunk of c.chunks){const item=document.createElement('details'),label=document.createElement('summary'),body=document.createElement('pre');label.textContent=chunk.title;body.textContent=chunk.content;item.append(label,body);section.append(item);}root.append(section);
  }
  for(const warning of context.routing?.warnings||[]){const note=document.createElement('p');note.textContent=warning.group+': '+warning.reason;root.append(note);}
  root.scrollIntoView({block:'nearest'});
}
