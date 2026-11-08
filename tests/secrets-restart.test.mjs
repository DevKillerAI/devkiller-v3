import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import net from 'node:net';
import {randomInt} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function freePort(){for(let attempt=0;attempt<10;attempt++){const s=net.createServer();s.listen(randomInt(20000,40000),'127.0.0.1');try{await once(s,'listening');}catch(e){if(e.code==='EADDRINUSE'||e.code==='EACCES')continue;throw e;}const port=s.address().port;await new Promise(resolve=>s.close(resolve));return port;}throw new Error('No isolated test port available.');}
test('backend carrega o segredo após reiniciar e não o oferece por HTTP',async()=>{
  const ports=new Set();while(ports.size<3)ports.add(await freePort());
  const [port,preview,comparison]=ports,origin=`http://127.0.0.1:${port}`;
  const secretDir=path.join(root,'.secrets',String(port));
  const secret='sk-restart-test-placeholder-not-a-real-key';
  let child;
  async function start(){
    child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,DEVKILLER_PORT:String(port),DEVKILLER_PREVIEW_PORT:String(preview),DEVKILLER_COMPARISON_PORT:String(comparison)},windowsHide:true,stdio:'ignore'});
    for(let i=0;i<150;i++){if(child.exitCode!==null)throw new Error('Servidor de teste não iniciou.');try{const r=await fetch(origin+'/api/state');const s=await r.json();if(!s.busy)return s;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}
    throw new Error('Servidor de teste excedeu o tempo de inicialização.');
  }
  async function mutate(route,data={}){const s=await(await fetch(origin+'/api/state')).json();return fetch(origin+route,{method:'POST',headers:{Origin:origin,'X-DevKiller-Token':s.token,'Content-Type':'application/json'},body:JSON.stringify(data)});}
  async function stop(){const exited=once(child,'exit');const response=await mutate('/api/shutdown');assert.equal(response.status,200);await exited;child=null;}
  try{
    assert.equal((await start()).openai.configured,false);
    const saved=await mutate('/api/openai/key',{apiKey:secret});assert.equal(saved.status,200);assert.equal((await saved.text()).includes(secret),false);
    await stop();
    const loaded=await start();assert.equal(loaded.openai.configured,true);assert.equal(loaded.openai.storage,'windows-dpapi');assert.equal(JSON.stringify(loaded).includes(secret),false);
    assert.equal((await fetch(origin+'/.secrets/'+port+'/openai.dpapi')).status,404);
    assert.equal((await fetch(origin+'/api/openai/key')).status,404);
    assert.equal((await fetch(origin+'/settings')).status,200);
    const index=await(await fetch(origin+'/')).text();assert.equal(index.includes('id="api-key"'),false);
    await mutate('/api/openai/clear');await stop();assert.equal((await start()).openai.configured,false);await stop();
  }finally{
    if(child&&child.exitCode===null){const exited=once(child,'exit');child.kill();await exited;}
    const resolved=path.resolve(secretDir);assert.equal(path.dirname(resolved),path.join(root,'.secrets'));await fs.rm(resolved,{recursive:true,force:true});
  }
});
