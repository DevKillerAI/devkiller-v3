import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url),entries=JSON.parse(await fs.readFile(new URL('settings/4310/workers.json',root),'utf8'));
const active=[];
for(const [id,e] of Object.entries(entries)){try{const s=await(await fetch(`http://127.0.0.1:${e.port}/api/state`,{signal:AbortSignal.timeout(1000)})).json();if(s.busy)throw Error('Busy worker '+id);active.push({id,port:e.port,projectId:s.project?.id,revision:s.project?.revision,preview:s.previewUrl});}catch(e){if(e.message.startsWith('Busy'))throw e;}}
const origin='http://127.0.0.1:4310',state=await(await fetch(origin+'/api/state')).json();if(state.busy)throw Error('Engine is busy');
await fs.writeFile(new URL('validation/expansion/restore.json',root),JSON.stringify({at:new Date().toISOString(),workers:active},null,2));
for(const w of active){const o=`http://127.0.0.1:${w.port}`,s=await(await fetch(o+'/api/state')).json();await fetch(o+'/api/shutdown',{method:'POST',headers:{Origin:o,'Content-Type':'application/json','X-DevKiller-Token':s.token},body:'{}'});}
await fetch(origin+'/api/shutdown',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-DevKiller-Token':state.token},body:'{}'});
console.log('Idle services stopped. Preview restoration record saved.');
