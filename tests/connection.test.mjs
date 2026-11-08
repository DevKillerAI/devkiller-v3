import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {ConnectionStore,DEFAULT_MODEL,MODELS} from '../modules/connection.mjs';
import {generateApp} from '../modules/openai.mjs';
test('model defaults, durable selection, unsupported providers and corrupt configuration',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'devkiller-connection-'));
 try{const store=new ConnectionStore(directory);assert.equal((await store.load()).model,'gpt-6-luna');
 await store.save({provider:'openai',model:'gpt-5.6-terra'});assert.deepEqual(await new ConnectionStore(directory).load(),{provider:'openai',model:'gpt-5.6-terra'});
 await assert.rejects(store.save({provider:'local',model:DEFAULT_MODEL}),/not connected/);
 await assert.rejects(store.save({provider:'openai',model:'unlisted-model'}),/supported/);
 assert.equal((await store.load()).model,'gpt-5.6-terra');
 await fs.writeFile(store.file,'broken');await assert.rejects(store.load(),/could not be read/);
 await store.save({provider:'openai',model:DEFAULT_MODEL});assert.equal((await store.load()).model,DEFAULT_MODEL);
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});
test('each selected model reaches the provider unchanged with the same budget and no retry',async()=>{
 for(const {id:model}of MODELS){let calls=0;
 await assert.rejects(generateApp({apiKey:'sk-unit-test-placeholder-not-a-real-key',model,prompt:'Build a working task list',fetchImpl:async(url,options)=>{calls++;const body=JSON.parse(options.body);assert.equal(body.model,model);assert.equal(Object.hasOwn(body,"max_output_tokens"),false);assert.equal(body.temperature,undefined);assert.equal(body.store,false);return Response.json({error:{code:'model_not_found'}},{status:404});}}),/cannot access/);assert.equal(calls,1);}
 let calls=0;await assert.rejects(generateApp({apiKey:'sk-unit-test-placeholder-not-a-real-key',model:'unknown',prompt:'Build a working task list',fetchImpl:async()=>{calls++;}}),/supported/);assert.equal(calls,0);
});
