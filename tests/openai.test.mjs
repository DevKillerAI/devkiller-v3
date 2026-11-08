import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateApp,validateKey,validatePrompt,parseApp,apiError} from '../modules/openai.mjs';
const key='sk-unit-test-placeholder-not-a-real-key';
const app={title:'Contador',summary:'Conta cliques.',limitations:[],files:[{name:'index.html',content:'<h1>Contador</h1>'}]};
function stream(events, fragmented=false) {
  const bytes=new TextEncoder().encode(events.map(e=>'data: '+JSON.stringify(e)+'\r\n\r\n').join(''));
  return new Response(new ReadableStream({start(controller){const size=fragmented?7:bytes.length;for(let i=0;i<bytes.length;i+=size)controller.enqueue(bytes.slice(i,i+size));controller.close();}}),{headers:{'Content-Type':'text/event-stream'}});
}
const complete={type:'response.completed',response:{usage:{input_tokens:100,output_tokens:200,total_tokens:300}}};
test('transmite apenas ao endpoint OpenAI fixo; recebe chunks e contabiliza uso',async()=>{
  let calls=0,progress=0;
  const result=await generateApp({apiKey:key,prompt:'Crie um contador de cliques',onProgress:p=>progress=p.characters,fetchImpl:async(url,options)=>{
    calls++;assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(options.headers.Authorization,`Bearer ${key}`);
    const body=JSON.parse(options.body);assert.equal(body.store,false);assert.equal(body.stream,true);assert.equal(Object.hasOwn(body,"max_output_tokens"),false);assert.equal(body.text.format.strict,true);assert.equal(options.body.includes(key),false);
    return stream([{type:'response.output_text.delta',delta:JSON.stringify(app)},complete],true);
  }});
  assert.equal(calls,1);assert.equal(result.title,'Contador');assert.equal(result.usage.total,300);assert.ok(progress>0);
});
test('401 nunca expõe chave ou mensagem bruta e não repete chamada',async()=>{
  let calls=0;
  await assert.rejects(generateApp({apiKey:key,prompt:'Crie uma lista de tarefas',fetchImpl:async()=>{calls++;return Response.json({error:{message:`Invalid API key ${key}`}},{status:401});}}),error=>{assert.equal(error.message.includes(key),false);return /rejected the key/.test(error.message);});
  assert.equal(calls,1);
});
test('saída incompleta preserva contagem sem tentar completar com outra chamada',async()=>{
  await assert.rejects(generateApp({apiKey:key,prompt:'Crie uma lista de tarefas',fetchImpl:async()=>stream([{type:'response.incomplete',response:{usage:{input_tokens:10,output_tokens:12000,total_tokens:12010}}}])}),error=>error.usage.total===12010&&/output limit/.test(error.message));
});
test('conexão interrompida e pacote inválido não viram aplicativos',async()=>{
  await assert.rejects(generateApp({apiKey:key,prompt:'Crie uma lista de tarefas',fetchImpl:async()=>stream([{type:'response.output_text.delta',delta:'{'}])}),error=>{assert.match(error.message,/connection ended/);assert.equal(error.partialResponse,'{');assert.equal(JSON.stringify(error).includes('partialResponse'),false);return true;});
  assert.throws(()=>parseApp('{'),/invalid format/);
  assert.throws(()=>parseApp(JSON.stringify({...app,files:[{name:'../index.html',content:'x'}]})),/Invalid/);
});
test('cancelamento aborta a chamada sem nova tentativa',async()=>{
  const controller=new AbortController();let calls=0;
  const promise=generateApp({apiKey:key,prompt:'Crie uma lista de tarefas',signal:controller.signal,fetchImpl:async(_,{signal})=>{calls++;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));}});
  controller.abort();await assert.rejects(promise,/cancelled/);assert.equal(calls,1);
});
test('timeout é finito e ausência de saldo recebe mensagem compreensível',async()=>{
  await assert.rejects(generateApp({apiKey:key,prompt:'Crie uma lista de tarefas',timeoutMs:10,fetchImpl:async(_,{signal})=>new Promise((resolve,reject)=>{const timer=setTimeout(resolve,1000);signal.addEventListener('abort',()=>{clearTimeout(timer);reject(signal.reason);},{once:true});})}),/exceeded/);
  assert.match(apiError(429,'insufficient_quota'),/no balance/);
});
test('chave e pedido inválidos são rejeitados antes de usar a API',()=>{
  for(const value of ['', 'not-a-key', key+'\nInjected: true'])assert.throws(()=>validateKey(value));
  for(const value of ['', 'a'.repeat(8001),null])assert.throws(()=>validatePrompt(value));
});
