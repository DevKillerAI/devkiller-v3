import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {reviewRenderedApp} from '../modules/visual-review.mjs';
import {contextPayload,digest} from '../modules/knowledge.mjs';

test('rendered review transports visual references as data and reuses its saved receipt',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'dk-stage-review-'));
 const server=http.createServer((req,res)=>res.end('<!doctype html><meta name="viewport" content="width=device-width"><title>Fixture</title><h1>Repair workshop</h1>'));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let calls=0;
 const knowledgeContext={indexVersion:'fixture',chunks:[{id:'DS009',title:'Polish',source:'https://example.test/reference',content:'Check legibility, alignment and overlap.',hash:'fixture'}]};knowledgeContext.hash=digest(contextPayload(knowledgeContext));
 const opts={generationProfile:'efficient',tasteMode:'auto',visualDirection:{palette:'charcoal and orange'},folder,url:`http://127.0.0.1:${server.address().port}/`,prompt:'Repair workshop',files:[],apiKey:'fixture',model:'fixture',knowledgeContext,fetchImpl:async(_,o)=>{
  calls++;const b=JSON.parse(o.body);assert.match(b.instructions,/VISUAL RUBRIC/);assert.equal(Object.hasOwn(b,"max_output_tokens"),false);assert.equal(b.reasoning.effort,'medium');assert.deepEqual(JSON.parse(b.input[0].content[0].text).visualDirection,opts.visualDirection);assert.deepEqual(JSON.parse(b.input[0].content[0].text).knowledge,JSON.parse(contextPayload(knowledgeContext)));assert.equal(b.input[0].content.filter(x=>x.type==='input_image').length,4);assert.ok(!b.instructions.includes(knowledgeContext.chunks[0].content));
  return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({verdict:'ready-for-human-review',findings:[]})}]}]});
 }};
 try{const result=await reviewRenderedApp(opts);assert.equal(result.taste.mode,'auto');assert.equal(result.status,'completed');assert.equal(result.knowledgeHash,knowledgeContext.hash);await reviewRenderedApp(opts);assert.equal(calls,1);}finally{await new Promise(r=>server.close(r));await fs.rm(folder,{recursive:true,force:true});}
});
