import {test} from 'node:test';
import assert from 'node:assert/strict';
import {repairInput,repairApp} from '../modules/openai.mjs';
import {filesHash,compareRepair} from '../modules/repair.mjs';
const files=[{name:'index.html',content:'<script>missingVariable=true</script>'}];
const errors=[{category:'funcional',status:'failed',check:'javascript-startup',observed:'Variável ausente.',evidence:'missingVariable is not defined'}];
test('correção envia arquivos, diagnóstico e pedido quando existente sem inventar pedido ausente',()=>{
  const input=JSON.parse(repairInput({files,diagnostics:errors,originalPrompt:null}));assert.equal(input.task,'repair');assert.equal(input.original_request,null);assert.deepEqual(input.files,files);assert.deepEqual(input.diagnostics,errors);
  assert.equal(JSON.parse(repairInput({files,diagnostics:errors,originalPrompt:'Crie meu jogo'})).original_request,'Crie meu jogo');
  assert.throws(()=>repairInput({files,diagnostics:[]}),/no confirmed functional issue/);
  assert.throws(()=>repairInput({files:[{name:'index.html',content:'a'.repeat(160000)}],diagnostics:errors}),/size limit/);
});
test('comparação detecta ausência de progresso e não aceita verificação inconclusiva',()=>{
  assert.equal(filesHash(files),filesHash([...files].reverse()));
  assert.equal(compareRepair(errors,errors,files,files).changed,false);
  assert.equal(compareRepair(errors,[{category:'ambiente',status:'failed'}],files,files).accepted,false);
  const result=compareRepair(errors,[{category:'funcional',status:'passed'}],files,[{name:'index.html',content:'<h1>ok</h1>'}]);assert.equal(result.accepted,true);assert.equal(result.beforeErrors,1);assert.equal(result.afterErrors,0);
});
test('correção faz uma chamada e preserva os limites e a instrução de manter o app',async()=>{
  let count=0;
  await assert.rejects(repairApp({apiKey:'sk-repair-test-placeholder-not-a-real-key',files,diagnostics:errors,fetchImpl:async(_url,options)=>{count++;const body=JSON.parse(options.body);assert.equal(Object.hasOwn(body,"max_output_tokens"),false);assert.match(body.instructions,/Não substitua um jogo 3D/);assert.equal(JSON.parse(body.input).task,'repair');return Response.json({error:{code:'insufficient_quota'}},{status:429});}}),/no balance/);
  assert.equal(count,1);
});
