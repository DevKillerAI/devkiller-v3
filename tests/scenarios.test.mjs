import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {inspectBrowser,summarizeQuality} from '../modules/browser-qa.mjs';
import {inspectScenarios,validateScenarios} from '../modules/scenarios.mjs';
import {compareRepair} from '../modules/repair.mjs';
import {repairInput} from '../modules/openai.mjs';
const scenario={requirement:'Clicking Add increases the counter.',steps:[{action:'click',target:'#add',value:''},{action:'text',target:'#value',value:'1'}]};
test('toast auxiliary text stays visible as a disputed assertion, not a paid repair',async t=>{
  const html='<meta charset="utf-8"><div id="toast">Inventory saved<button>×</button></div>',files=[{name:'index.html',content:html}];
  const url=await host(t,html);
  const checks=await inspectScenarios(url,files,[{requirement:'Saving shows confirmation.',steps:[{action:'text',target:'#toast',value:'Inventory saved'}]}],{stepTimeout:100});
  assert.equal(checks[0].status,'failed');
  assert.equal(checks[0].repairEligible,false);
  assert.equal(checks[0].reviewRequired,true);
  assert.match(checks[0].evidence,/×/);
  assert.throws(()=>repairInput({files,diagnostics:checks}),/no confirmed functional issue/);
});
async function host(t,content){const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(content);});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));return `http://127.0.0.1:${server.address().port}/`;}
test('A/B: a dead button passes the old startup check but fails a real interaction',async t=>{const files=[{name:'index.html',content:'<button id="add">Add</button><output id="value">0</output>'}],url=await host(t,files[0].content);const old=await inspectBrowser(url,files,{settleMs:50});assert.equal(summarizeQuality(old).status,'basic-passed');const actual=await inspectScenarios(url,files,[scenario]);assert.equal(actual[0].status,'failed');assert.match(actual[0].evidence,/observed "0"/);assert.equal(actual[0].artifactHash.length,64);});
test('working interactions pass, each scenario gets a fresh browser context',async t=>{const html='<button id="add" onclick="document.querySelector(\'#value\').textContent=Number(document.querySelector(\'#value\').textContent)+1">Add</button><output id="value">0</output>',url=await host(t,html);let resets=0;const checks=await inspectScenarios(url,[{name:'index.html',content:html}],[scenario,scenario],{resetData:()=>resets++});assert.deepEqual(checks.map(c=>c.status),['passed','passed']);assert.equal(resets,3);});
test('browser failure and exhausted check budget remain unverified, not app defects',async t=>{const url=await host(t,'<h1>test</h1>');const checks=await inspectScenarios(url,[],[scenario],{launch:async()=>{throw new Error('Missing browser');}});assert.equal(checks[0].category,'ambiente');assert.equal(checks[0].status,'pending');assert.equal(summarizeQuality(checks).status,'unverified');const timed=await inspectScenarios(url,[],[scenario],{timeoutMs:0});assert.equal(timed[0].status,'pending');assert.equal(compareRepair([],checks,[],[]).accepted,false);});
test('invalid or unbounded plans cannot execute code or mark an app failed',async()=>{assert.throws(()=>validateScenarios([{...scenario,steps:[{action:'eval',target:'',value:'process.exit()'}]}]));assert.throws(()=>validateScenarios(Array(7).fill(scenario)));assert.throws(()=>validateScenarios([{requirement:'Nothing',steps:[{action:'click',target:'body',value:''}]}]));const result=await inspectScenarios('http://127.0.0.1:1/',[],[{bad:true}]);assert.equal(result[0].status,'pending');});
test('repair cannot pass by dropping a previously recorded scenario',()=>{const before=[{category:'funcional',status:'failed',check:'acceptance-1'}];assert.equal(compareRepair(before,[{category:'funcional',status:'passed',check:'javascript-startup'}],[],[]).accepted,false);});
test('an interaction timeout is inconclusive instead of proof of a broken app',async t=>{const url=await host(t,'<button id="add" disabled>Add</button><output id="value">0</output>');const checks=await inspectScenarios(url,[],[scenario],{stepTimeout:50});assert.equal(checks[0].category,'ambiente');assert.equal(checks[0].status,'pending');assert.match(checks[0].evidence,/Timeout/);});
