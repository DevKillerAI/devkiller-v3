import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {chooseIntervention,verifiedProgress,observationImages} from '../modules/observation-cycle.mjs';
import {refineOnce,refinementAccepted} from '../modules/design-process.mjs';
import {reviewRenderedApp} from '../modules/visual-review.mjs';
import {polishDesign} from '../modules/design-polish.mjs';
import {planSchema} from '../modules/product-plan.mjs';
const issue={category:'visual',evidence:'Primary work is below a large form',action:'Prioritize the working list',verification:'The work list is visible in the initial desktop viewport'};
const observed={status:'completed',review:{verdict:'needs-work',findings:[issue]}};
const response=value=>Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]});

test('decision distinguishes evidence gaps, functional suspicions, visual intervention and delivery',()=>{
 assert.equal(chooseIntervention({status:'uncertain'}).action,'needs-evidence');
 assert.equal(chooseIntervention({status:'completed',review:{findings:[]}}).action,'deliver-for-human-review');
 const review={status:'completed',review:{findings:[issue,{category:'functional-risk',evidence:'Possible lost draft',action:'Verify navigation'}]}};
 const decision=chooseIntervention(review);assert.equal(decision.action,'refine-presentation');assert.equal(decision.targets.length,1);assert.equal(decision.pending.length,1);
 assert.equal(chooseIntervention({...review,review:{findings:[review.review.findings[1]]}}).action,'investigate-behavior');
 assert.equal(decision.targets[0].id,chooseIntervention(review).targets[0].id);
});

test('the previous false success is rejected even when the verdict says ready',()=>{
 const targets=chooseIntervention(observed).targets;
 const candidate={status:'completed',review:{verdict:'ready-for-human-review',progress:{regression:false,outcomes:[]}}};
 assert.equal(refinementAccepted([],[],candidate,targets),false);
 for(const status of ['partial','unresolved','unverified']){candidate.review.progress.outcomes=[{id:targets[0].id,status,evidence:'Still visible'}];assert.equal(verifiedProgress(targets,candidate),false);}
 candidate.review.progress.outcomes=[{id:targets[0].id,status:'resolved',evidence:'The list now occupies the first viewport.'}];
 assert.equal(refinementAccepted([],[],candidate,targets),true);
 candidate.review.progress.regression=true;assert.equal(refinementAccepted([],[],candidate,targets),false);
 candidate.review.progress.regression=false;candidate.review.progress.outcomes.push(candidate.review.progress.outcomes[0]);assert.equal(verifiedProgress(targets,candidate),false);
});

test('uncertain observation does not spend a model call and records its reason',async t=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'dk-observe-'));t.after(()=>fs.rm(folder,{recursive:true,force:true}));
 const result=await refineOnce({folder,files:[],review:{status:'uncertain'},edit:()=>assert.fail('must not edit without evidence')});
 assert.equal(result.calls,0);assert.equal(JSON.parse(await fs.readFile(path.join(folder,'observation-decision.json'))).decision.action,'needs-evidence');
 await assert.rejects(observationImages(folder,{captures:[{file:'../../secret.png'}]}),/Invalid observation/);
});

test('planning requires a real composition choice and observable success criteria',()=>{
 const v=planSchema.properties.visualDirection;
 assert.ok(v.required.includes('compositionDecision'));assert.ok(v.required.includes('successCriteria'));
 assert.equal(v.properties.compositionDecision.properties.alternatives.minItems,2);
});

test('real browser captures reach editor and before-after evaluator; receipts prevent replay',async t=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'dk-cycle-e2e-'));t.after(()=>fs.rm(folder,{recursive:true,force:true}));
 let html='<main><h1>Renovation budget</h1><p>Materials and labor</p></main>';
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html);});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const url='http://127.0.0.1:'+server.address().port+'/';let calls=0;
 const beforeFolder=path.join(folder,'before');
 const before=await reviewRenderedApp({folder:beforeFolder,url,files:[],fetchImpl:async()=>{calls++;return response(observed.review);}});
 assert.equal(before.status,'completed');assert.ok(before.captures.length>=2);
 const observations=await observationImages(beforeFolder,before);const targets=chooseIntervention(before).targets;
 let editorBody;
 const baseFiles=[{name:'src/App.jsx',content:'export default function App(){return <h1>Budget</h1>}'},{name:'src/styles.css',content:'body{color:black}'}];
 const edited=await polishDesign({apiKey:'sk-fixture-not-a-secret',model:'gpt-5.6-sol',stack:'react-v5',files:baseFiles,findings:targets,observations,fetchImpl:async(_,o)=>{
  editorBody=JSON.parse(o.body);return new Response('data: '+JSON.stringify({type:'response.completed',response:{output:[{content:[{type:'output_text',text:JSON.stringify({title:'Budget',summary:'Updated composition',limitations:[],scenarios:[],files:[{name:'src/styles.css',content:'body{color:navy}'}]})}]}]}})+'\n\n');
 }});
 assert.ok(editorBody.input[0].content.some(c=>c.type==='input_image'));assert.match(editorBody.instructions,/actual screenshots/);assert.equal(edited.changedFiles[0],'src/styles.css');
 html='<main><h1>Renovation budget</h1><table><tr><td>Materials</td><td>1200</td></tr></table></main>';
 let reviewBody;
 const opts={folder:path.join(folder,'after'),url,files:edited.files,targets,previousObservation:{folder:beforeFolder,review:before},fetchImpl:async(_,o)=>{calls++;reviewBody=JSON.parse(o.body);return response({verdict:'ready-for-human-review',findings:[],progress:{regression:false,outcomes:targets.map(f=>({id:f.id,status:'resolved',evidence:'The current screenshot shows the working table after the heading.'}))}});}};
 const after=await reviewRenderedApp(opts);assert.equal(after.status,'completed');
 assert.ok(reviewBody.input[0].content.some(c=>c.text?.startsWith('BEFORE intervention')));
 assert.equal(reviewBody.input[0].content.filter(c=>c.type==='input_image').length,before.captures.length+after.captures.length);
 assert.equal(refinementAccepted([],[],after,targets),true);
 await reviewRenderedApp(opts);assert.equal(calls,2);
});

test('production refinement is wired to the screenshot-aware path, not the legacy targeted editor',async()=>{
 const server=await fs.readFile(new URL('../server.mjs',import.meta.url),'utf8');
 const flow=server.slice(server.indexOf('async function refineGeneratedDesign'),server.indexOf('async function runGeneration'));
 assert.match(flow,/polishDesign\(/);assert.match(flow,/observations:await observationImages/);assert.match(flow,/previousObservation:/);assert.match(flow,/refinementAccepted\(baseline,checks,review,targets\)/);assert.doesNotMatch(flow,/targetedEdit\(/);
});
