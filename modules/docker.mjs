import fs from 'node:fs/promises';
import {startBackend} from './backend-runtime.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { createHash } from 'node:crypto';
const exec = promisify(execFile);
export const IMAGE = 'node:24-alpine';
export class DockerRuntime {
  constructor(root, scope='4310') { this.root = root; this.label = `devkiller.executor=${createHash('sha256').update(root.toLowerCase() + ':' + scope).digest('hex').slice(0,16)}`; }
  async command(args, timeout = 25000) {
    try { const result=await exec('docker', args, {timeout, windowsHide:true, maxBuffer:1024*1024});return (args[0]==='logs'?result.stdout+result.stderr:result.stdout).trim(); }
    catch (error) { throw new Error(error.stderr?.trim() || error.message); }
  }
  async check() {
    try { await this.command(['info','--format','{{.ServerVersion}}'], 8000); }
    catch { return {ready:false, message:'Docker is stopped or unavailable. Open Docker Desktop and wait for it to start.'}; }
    try { await this.command(['image','inspect',IMAGE], 8000); }
    catch { return {ready:false, message:'The runtime image is missing. Run Preparar.ps1 once with internet access.'}; }
    return {ready:true, message:'Docker ready. Each version runs in its own container.'};
  }
  async start(name, folder, options={}) {
    if(await fs.stat(path.join(folder,'backend','routes.mjs')).then(()=>true,()=>false))return startBackend(this,name,folder,options);
    await this.command(['run','-d','--name',name,'--label',this.label,'--memory','128m','--memory-swap','128m','--cpus','0.5','--pids-limit','64','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--user','65534:65534','--publish','127.0.0.1::8080','--mount',`type=bind,source=${folder},target=/app/public,readonly`,'--mount',`type=bind,source=${path.join(this.root,'runtime','static-server.cjs')},target=/runner.cjs,readonly`,IMAGE,'node','/runner.cjs']);
    const mappings = JSON.parse(await this.command(['inspect','--format','{{json .NetworkSettings.Ports}}',name]));
    const port = Number(mappings['8080/tcp'][0].HostPort);
    return {name, port,framework:options.stack==='angular-v1'?'angular':null};
  }
  async remove(name) {
    let networks=[];
    try{networks=Object.keys(JSON.parse(await this.command(['inspect','--format','{{json .NetworkSettings.Networks}}',name]))||{}).filter(n=>/^dk-app-[a-f0-9]{20}$/.test(n));}catch{}
    try{await this.command(['rm','-f',name+'-api']);}catch(error){if(!/No such container/i.test(error.message))throw error;}
    try { await this.command(['rm','-f',name]); }
    catch (error) { if (!/No such container/i.test(error.message)) throw error; }
    for(const network of networks){try{const entries=Object.values(JSON.parse(await this.command(['network','inspect','--format','{{json .Containers}}',network]))||{});if(entries.length===1&&entries[0].Name===network+'-db')await this.command(['stop',network+'-db']);}catch{}}
  }
  async cleanup() {
    const ids = await this.command(['ps','-aq','--filter',`label=${this.label}`]);
    for (const id of ids.split(/\s+/).filter(Boolean)) await this.remove(id);
  }
}
