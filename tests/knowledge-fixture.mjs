// Explicit test process only. Fake embeddings validate transport/integration, not quality.
import './orchestrator-fixture.mjs';
import {RunStore} from '../modules/orchestrator.mjs';
import fs from 'node:fs';
import path from 'node:path';
const previousFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
  if(String(url)!=='https://api.openai.com/v1/embeddings')return previousFetch(url,options);
  if(options.headers.Authorization!=='Bearer sk-browser-test-placeholder-not-a-real-key')throw new Error('Only the fake fixture key is accepted.');
  const counter=path.resolve('settings',process.env.DEVKILLER_PORT,'embedding-calls.txt');let calls=0;try{calls=Number(fs.readFileSync(counter,'utf8'));}catch{}fs.mkdirSync(path.dirname(counter),{recursive:true});fs.writeFileSync(counter,String(calls+1));
  const request=JSON.parse(options.body);return Response.json({model:request.model,data:request.input.map((text,index)=>{const embedding=Array(request.dimensions).fill(0);for(const c of text)embedding[c.charCodeAt(0)%embedding.length]++;return {index,embedding};}),usage:{total_tokens:100}});
};
const checkpoint=RunStore.prototype.checkpoint;
RunStore.prototype.checkpoint=function(run,type,patch){const result=checkpoint.call(this,run,type,patch);if(type==='knowledge.saved'&&run.job.prompt.includes('CRASH_KNOWLEDGE'))process.exit(84);return result;};
