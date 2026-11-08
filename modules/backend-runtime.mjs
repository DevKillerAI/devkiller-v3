import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import {SecretStore} from './secrets.mjs';
const pending=new Map();
export async function startBackend(runtime,name,folder,{projectId,qaToken='',stack,temporary=false}){
 if(!/^[a-f0-9-]{36}$/.test(projectId||''))throw Error('Backend preview requires a persistent project.');
 const id=createHash('sha256').update(runtime.root.toLowerCase()+':'+projectId).digest('hex').slice(0,20),network='dk-app-'+id,pgName=network+'-db';
 if(!pending.has(id))pending.set(id,(async()=>{
  const vault=new SecretStore(path.join(runtime.root,'.secrets','postgres',id));let password=temporary?randomBytes(32).toString('hex'):await vault.load();if(!password){password=randomBytes(32).toString('hex');await vault.save(password);}
  try{await runtime.command(['network','inspect',network]);}catch{await runtime.command(['network','create','--internal',network]);}
  let exists=true;try{await runtime.command(['inspect',pgName]);}catch{exists=false;}
  if(!exists)await runtime.command(['run','-d','--name',pgName,'--label','devkiller.database='+id,'--network',network,'--network-alias','database','--memory','384m','--cpus','0.5','--pids-limit','128',...(temporary?['--tmpfs','/var/lib/postgresql/data:rw,size=268435456']:['--mount',`type=volume,source=${network}-data,target=/var/lib/postgresql/data`]),'--env','POSTGRES_USER=devkiller','--env','POSTGRES_DB=app','--env','POSTGRES_PASSWORD='+password,'postgres:17-alpine']);
  else await runtime.command(['start',pgName]);
  for(let i=0;i<40;i++){try{await runtime.command(['exec',pgName,'pg_isready','-U','devkiller','-d','app'],3000);return {password};}catch{await new Promise(r=>setTimeout(r,250));}}
  throw Error('PostgreSQL did not become ready. Saved data was preserved.');
 })().finally(()=>pending.delete(id)));
 const {password}=await pending.get(id),qaSchema=createHash('sha256').update(name).digest('hex').slice(0,16),apiName=name+'-api';
 await runtime.command(['run','-d','--name',apiName,'--label',runtime.label,'--network',network,'--memory','384m','--memory-swap','384m','--cpus','1','--pids-limit','128','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--user','1000:1000','--tmpfs','/tmp:rw,noexec,nosuid,size=33554432,uid=1000,gid=1000','--env',`DATABASE_URL=postgresql://devkiller:${password}@database:5432/app`,'--env','PREVIEW_TTL_MS=1800000','--env','QA_SCHEMA='+qaSchema,'--env','QA_TOKEN='+qaToken,'--mount',`type=bind,source=${folder},target=/app/public,readonly`,'--mount',`type=bind,source=${path.join(runtime.root,'runtime','backend-server.mjs')},target=/opt/backend/runner.mjs,readonly`,'devkiller-backend:1']);
 await runtime.command(['run','-d','--name',name,'--label',runtime.label,'--memory','64m','--cpus','0.25','--pids-limit','32','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--user','65534:65534','--publish','127.0.0.1::8080','--env','BACKEND_HOST='+apiName,'--mount',`type=bind,source=${path.join(runtime.root,'runtime','backend-gateway.cjs')},target=/gateway.cjs,readonly`,'node:24-alpine','node','/gateway.cjs']);
 await runtime.command(['network','connect',network,name]);
 const mappings=JSON.parse(await runtime.command(['inspect','--format','{{json .NetworkSettings.Ports}}',name]));
 return {name,port:Number(mappings['8080/tcp'][0].HostPort),backend:true,database:'PostgreSQL',databaseContainer:pgName,databaseNetwork:network,temporaryDatabase:temporary,framework:stack==='angular-v1'?'angular':null};
}
