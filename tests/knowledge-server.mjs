import {spawn} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import {randomInt} from 'node:crypto';
import {fileURLToPath} from 'node:url';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const delay=ms=>new Promise(r=>setTimeout(r,ms));
// Avoid the Windows ephemeral client-port range: startup polling can consume a
// just-released ephemeral listener port before the child binds it.
async function freePort(){for(let attempt=0;attempt<10;attempt++){const s=net.createServer();s.listen(randomInt(20000,40000),'127.0.0.1');try{await once(s,'listening');}catch(e){if(e.code==='EADDRINUSE'||e.code==='EACCES')continue;throw e;}const p=s.address().port;await new Promise(r=>s.close(r));return p;}throw new Error('No isolated test port available.');}
export async function createServer({fixture=true,real=false,fixtureModule='./tests/knowledge-fixture.mjs'}={}){
  const ports=new Set();while(ports.size<3)ports.add(await freePort());const [port,preview,comparison]=ports,origin=`http://127.0.0.1:${port}`;
  for(const parent of ['projects','.secrets','settings']){try{await fs.access(path.join(root,parent,String(port)));throw new Error('The randomly selected test port has existing data; refusing to reuse it.');}catch(e){if(e.code!=='ENOENT')throw e;}}
  if(real){await fs.mkdir(path.join(root,'.secrets',String(port)),{recursive:true});await fs.copyFile(path.join(root,'.secrets','4310','openai.dpapi'),path.join(root,'.secrets',String(port),'openai.dpapi'));await fs.mkdir(path.join(root,'settings',String(port)),{recursive:true});await fs.copyFile(path.join(root,'settings','4310','connection.json'),path.join(root,'settings',String(port),'connection.json')).catch(e=>{if(e.code!=='ENOENT')throw e;});}
  let child,log='';
  const state=async()=>{const r=await fetch(origin+'/api/state');if(!r.ok)throw new Error('State unavailable');return r.json();};
  async function post(route,data={}){const s=await state(),r=await fetch(origin+'/api/'+route,{method:'POST',headers:{Origin:origin,'X-DevKiller-Token':s.token,'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await r.json();if(!r.ok)throw new Error(`${route}: ${r.status} ${result.error}`);return result;}
  async function ready(timeoutMs=45000,onProgress=()=>{}){const started=Date.now();while(Date.now()-started<timeoutMs){try{const s=await state();onProgress(s);if(!s.busy)return s;}catch{}if(child?.exitCode!==null&&child?.exitCode!==undefined)throw new Error('Test server exited: '+log.slice(-1200));await delay(200);}throw new Error('Server operation timed out. It was not repeated.');}
  async function start(){child=spawn(process.execPath,[...(fixture?['--import',fixtureModule]:[]),'server.mjs'],{cwd:root,env:{...process.env,DEVKILLER_PORT:String(port),DEVKILLER_PREVIEW_PORT:String(preview),DEVKILLER_COMPARISON_PORT:String(comparison)},windowsHide:true,stdio:['ignore','pipe','pipe']});for(const stream of [child.stdout,child.stderr])stream.on('data',d=>{log=(log+d.toString()).slice(-8000);});await ready();}
  async function stop(){if(child?.exitCode===null){const exit=once(child,'exit');try{await post('shutdown');}catch{child.kill();}await exit;}}
  async function cleanup(){await stop();for(const parent of ['projects','.secrets','settings']){const target=path.resolve(root,parent,String(port));if(path.dirname(target)!==path.join(root,parent))throw new Error('Unsafe cleanup path');await fs.rm(target,{recursive:true,force:true});}}
  await start();return {origin,port,state,post,ready,start,stop,cleanup,child:()=>child,log:()=>log};
}
