import fs from 'node:fs/promises';import path from 'node:path';import net from 'node:net';import {spawn} from 'node:child_process';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const busy=()=>Object.assign(Error('Both execution slots are occupied. Your request can wait in the queue.'),{status:409});
async function freePort(){const server=net.createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const port=server.address().port;await new Promise(r=>server.close(r));return port;}
export class WorkerPool {
 constructor(root,scope,{mainBusy=()=>false,max=2}={}){this.root=root;this.scope=scope;this.file=path.join(root,'settings',scope,'workers.json');this.entries={};this.max=max;this.mainBusy=mainBusy;this.lock=false;}
 async initialize(){try{this.entries=JSON.parse(await fs.readFile(this.file,'utf8'));for(const [id,e] of Object.entries(this.entries)){if(!/^[a-f0-9-]{36}$/.test(id)||![e.port,e.preview,e.comparison].every(p=>Number.isInteger(p)&&p>1024&&p<65536))throw Error('Invalid worker registry');}}catch(e){if(e.code!=='ENOENT')throw e;}}
 async save(){await fs.mkdir(path.dirname(this.file),{recursive:true});const data=Object.fromEntries(Object.entries(this.entries).map(([id,{port,preview,comparison}])=>[id,{port,preview,comparison}]));await fs.writeFile(this.file,JSON.stringify(data,null,2));}
 async state(e){try{const r=await fetch(`http://127.0.0.1:${e.port}/api/state`,{signal:AbortSignal.timeout(800)});const s=await r.json();if(s.workerId!==e.id)return null;return s;}catch{return null;}}
 async status(){const entries=await Promise.all(Object.entries(this.entries).map(async([id,e])=>{e.id=id;const s=await this.state(e);if(s?.busy)e.reservedUntil=0;return {id,online:!!s,busy:!!s?.busy||Date.now()<(e.reservedUntil||0)};}));return {limit:this.max,active:entries.filter(e=>e.busy).length+(this.mainBusy()?1:0),workers:entries};}
 async lease(id){if(!/^[a-f0-9-]{36}$/.test(id||''))throw Error('Invalid project worker.');if(this.lock)throw busy();this.lock=true;try{
  const status=await this.status(),own=status.workers.find(e=>e.id===id);if(own?.busy)throw busy();if(status.active>=this.max)throw busy();
  let e=this.entries[id];if(!e){const ports=new Set();while(ports.size<3)ports.add(await freePort());const [port,preview,comparison]=ports;e=this.entries[id]={id,port,preview,comparison};await this.save();}e.id=id;e.reservedUntil=Date.now()+45000;
  let state=await this.state(e);
  if(!state){
   // Keep at most four resident workers. Idle previews can be reopened from their saved versions.
   const residents=status.workers.filter(w=>w.online&&w.id!==id);if(residents.length>=4){const idle=residents.find(w=>!w.busy);if(!idle)throw busy();await this.stop(idle.id);}
   e.child=spawn(process.execPath,[...process.execArgv,'server.mjs'],{cwd:this.root,windowsHide:true,stdio:'ignore',env:{...process.env,DEVKILLER_PORT:String(e.port),DEVKILLER_PREVIEW_PORT:String(e.preview),DEVKILLER_COMPARISON_PORT:String(e.comparison),DEVKILLER_CONFIG_SCOPE:this.scope,DEVKILLER_WORKER_ID:id}});e.child.on('error',()=>{});
   const deadline=Date.now()+30000;while(Date.now()<deadline){state=await this.state(e);if(state&&!state.busy)break;if(e.child.exitCode!==null)throw Error('The isolated executor could not start.');await pause(250);}if(!state||state.busy)throw Error('The isolated executor did not finish starting.');
  }
  return {origin:`http://127.0.0.1:${e.port}`,workerId:id,limit:this.max};
 }catch(error){if(this.entries[id])this.entries[id].reservedUntil=0;throw error;}finally{this.lock=false;}}
 async release(id){if(this.entries[id])this.entries[id].reservedUntil=0;}
 async stop(id){const e=this.entries[id];if(!e)return;const s=await this.state({...e,id});if(!s||s.busy)return;const origin=`http://127.0.0.1:${e.port}`;await fetch(origin+'/api/shutdown',{method:'POST',headers:{Origin:origin,'X-DevKiller-Token':s.token,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)}).catch(()=>{});}
 async close(){await Promise.all(Object.keys(this.entries).map(id=>this.stop(id)));}
}
