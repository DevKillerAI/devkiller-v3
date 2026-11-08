import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import {inspectBrowser,summarizeQuality} from '../modules/browser-qa.mjs';
async function fixture(script,run){
  const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/app.js'?'text/javascript':'text/html');res.end(req.url==='/app.js'?script:'<!doctype html><h1>App</h1><script src="app.js" defer></script>');});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  try{await run(`http://127.0.0.1:${server.address().port}/`);}finally{await new Promise(resolve=>server.close(resolve));}
}
test('diagnostica a falha de jogoAtivo a partir de execução real no navegador',async()=>{
  const script="'use strict';\njogoAtivo = true;";
  await fixture(script,async url=>{const result=await inspectBrowser(url,[{name:'app.js',content:script}],{settleMs:100});const fail=result.find(q=>q.status==='failed');assert.equal(fail.category,'funcional');assert.match(fail.observed,/jogoAtivo/);assert.equal(fail.file,'app.js');assert.equal(fail.line,2);assert.match(fail.correction,/Declare/);assert.equal(summarizeQuality(result).status,'issues');});
});
test('diagnóstico se aplica a outras variáveis e não depende do nome do jogo',async()=>{
  const script="'use strict';\npontuacaoInexistente = 10;";
  await fixture(script,async url=>{const result=await inspectBrowser(url,[{name:'app.js',content:script}],{settleMs:100});assert.match(result[0].observed,/pontuacaoInexistente/);assert.doesNotMatch(result[0].observed,/jogoAtivo/);});
});
test('inicialização sem exceção recebe aprovação apenas da verificação básica',async()=>{
  await fixture('document.body.dataset.ready="true"',async url=>{const result=await inspectBrowser(url,[],{settleMs:100});assert.equal(result[0].status,'passed');assert.equal(summarizeQuality(result).status,'basic-passed');assert.match(summarizeQuality(result).message,/still need testing/);});
});
test('falha do navegador de QA não é classificada como falha funcional do app',async()=>{
  const result=await inspectBrowser('http://127.0.0.1:1/',[],{launch:async()=>{throw new Error('fixture browser unavailable');}});assert.equal(result[0].category,'ambiente');assert.equal(summarizeQuality(result).status,'unverified');
});
