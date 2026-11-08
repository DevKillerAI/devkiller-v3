import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Input and decrypted output travel only through private process pipes, never argv/logs.
function crypt(operation, input) {
  if(process.platform!=='win32')return Promise.reject(new Error('This version’s local vault requires Windows.'));
  const transform=operation==='protect'
    ? '$plain=[Text.Encoding]::UTF8.GetBytes($inputValue); $protected=[Security.Cryptography.ProtectedData]::Protect($plain,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($protected))'
    : '$protected=[Convert]::FromBase64String($inputValue); $plain=[Security.Cryptography.ProtectedData]::Unprotect($protected,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Text.Encoding]::UTF8.GetString($plain))';
  const script='$ErrorActionPreference="Stop"; Add-Type -AssemblyName System.Security; $inputValue=[Console]::In.ReadToEnd(); '+transform;
  return new Promise((resolve,reject)=>{
    const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    let output='',failed=false;
    const fail=()=>{if(failed)return;failed=true;child.kill();reject(new Error('Could not access the Windows-protected key. Use the Windows account that saved it or replace the key.'));};
    const timer=setTimeout(fail,10000);
    child.on('error',fail);child.stdin.on('error',fail);
    child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{output+=chunk;if(output.length>16384)fail();});
    child.stderr.resume();
    child.on('close',code=>{clearTimeout(timer);if(failed)return;if(code!==0)return fail();resolve(output);});
    child.stdin.end(input,'utf8');
  });
}
export class SecretStore {
  constructor(directory) {this.directory=directory;this.file=path.join(directory,'openai.dpapi');}
  async load() {
    let encrypted;
    try {encrypted=await fs.readFile(this.file,'utf8');}catch(error){if(error.code==='ENOENT')return '';throw new Error('Could not read the local secret vault.');}
    return crypt('unprotect',encrypted);
  }
  async save(value) {
    const encrypted=await crypt('protect',value);
    await fs.mkdir(this.directory,{recursive:true,mode:0o700});
    const temporary=path.join(this.directory,randomUUID()+'.tmp');
    try {await fs.writeFile(temporary,encrypted,{mode:0o600,flag:'wx'});await fs.rename(temporary,this.file);}
    catch{throw new Error('Could not save the key in the backend. The previous key was preserved.');}
    finally {await fs.rm(temporary,{force:true}).catch(()=>{});}
  }
  async remove() {await fs.rm(this.file,{force:true});}
}
