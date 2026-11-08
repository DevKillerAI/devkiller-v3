// Fault injection is loaded explicitly by the test child process, never production.
import './openai-fixture.mjs';
import {RunStore} from '../modules/orchestrator.mjs';
import {ProjectStore} from '../modules/projects.mjs';
import fs from 'node:fs';
import path from 'node:path';
const fetchFixture=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
  if(String(url)==='https://api.openai.com/v1/responses'){
    const port=process.env.DEVKILLER_PORT;if(!/^\d+$/.test(port))throw new Error('Test port required');
    const counter=path.resolve('projects',port,'fixture-calls.txt');let n=0;try{n=Number(fs.readFileSync(counter,'utf8'));}catch{}fs.writeFileSync(counter,String(n+1));
    if(JSON.parse(options.body).input.includes('CRASH_PROVIDER'))process.exit(87);
  }
  return fetchFixture(url,options);
};
const checkpoint=RunStore.prototype.checkpoint;
RunStore.prototype.checkpoint=function(run,type,patch){const saved=checkpoint.call(this,run,type,patch);if(type==='provider.response-saved'&&run.job.prompt.includes('CRASH_RECEIPT'))process.exit(86);return saved;};
const saveVersion=ProjectStore.prototype.saveVersion;
ProjectStore.prototype.saveVersion=function(id,files,info){const version=saveVersion.call(this,id,files,info);if(this.info(id).prompt?.includes('CRASH_VERSION')&&!fs.existsSync(path.join(path.dirname(this.file(id)),'crashed'))){fs.writeFileSync(path.join(path.dirname(this.file(id)),'crashed'),'yes');process.exit(85);}return version;};
