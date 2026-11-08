// Only loaded by the isolated browser test process via --import. No production switch.
import {reactFiles} from './react-fixture.mjs';
import {designFiles} from './design-fixture.mjs';
const originalFetch=globalThis.fetch;
const fakeKey='sk-browser-test-placeholder-not-a-real-key';
const app={title:'Contador de teste',summary:'Contador local para verificar a conexão entre gerador e executor.',limitations:['Resposta simulada no teste automatizado; nenhuma chamada real à OpenAI.'],files:[{name:'index.html',content:'<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Contador</title><h1>Contador de teste</h1><button id="add">Somar um</button><output id="value">0</output><script>let n=0;document.querySelector("#add").onclick=()=>document.querySelector("#value").textContent=++n;</script></html>'}]};
globalThis.fetch=async(url,options)=>{
  if(String(url)!=='https://api.openai.com/v1/responses')return originalFetch(url,options);
  if(options.headers.Authorization!==`Bearer ${fakeKey}`)throw new Error('O processo de teste aceita somente a chave fictícia.');
  const request=JSON.parse(options.body);
  if(request.input.includes('SEM_SALDO'))return Response.json({error:{code:'insufficient_quota',message:'fixture'}},{status:429});
  if(request.input.includes('CHAVE_RECUSADA'))return Response.json({error:{code:'invalid_api_key',message:fakeKey}},{status:401});
  let output=app;
  if(request.instructions.includes('CONTRATO DEVKILLER react-v'))output={title:'React com banco local',summary:'Componentes React de teste, resposta simulada.',limitations:[],files:((request.instructions.includes('CONTRATO DEVKILLER react-v2')||request.instructions.includes('CONTRATO DEVKILLER react-v3'))?designFiles:reactFiles).map(f=>({...f,content:request.input.includes('REACT_BROKEN')?f.content.replace('export default function App()','export default function App('):f.content}))};
  if(request.input.includes('BANCO_LOCAL')&&!request.instructions.includes('CONTRATO DEVKILLER react-v'))output={title:'Banco local de teste',summary:'Teste de persistência, sem chamada real.',limitations:[],files:[{name:'index.html',content:'<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><h1>Banco local de teste</h1><button id="save" disabled>Salvar mais um</button><output id="count">Carregando</output><script src="/__devkiller/db.js"></script><script src="app.js" defer></script></html>'},{name:'app.js',content:"(async()=>{let n=await DevKillerDB.get('contador')??0;await DevKillerDB.set('abriu',true);const output=document.querySelector('#count'),button=document.querySelector('#save');output.textContent=n;button.disabled=false;button.onclick=async()=>{button.disabled=true;await DevKillerDB.set('contador',n+1);output.textContent=++n;button.disabled=false;};})().catch(e=>document.querySelector('#count').textContent=e.message);"}]};
  try{const data=JSON.parse(request.input);if(data.task==='repair')output={title:'Aplicativo corrigido de teste',summary:'Variável declarada sem alterar as demais funções.',limitations:[],files:data.files.map(file=>({...file,content:request.input.includes('SAME_CODE')?file.content:file.content.replace('jogoAtivo = true;','let jogoAtivo = true;')}))};}catch{}
  try{const data=JSON.parse(request.input);if(data.task==='repair'&&['react-v1','react-v2','react-v3'].includes(data.stack))output={title:'React corrigido de teste',summary:'Sintaxe corrigida na resposta simulada.',limitations:[],files:data.files.map(f=>({...f,content:f.content.replace('export default function App({','export default function App(){')}))};}catch{}
  if(request.input.includes('ENGINE_SCENARIO'))output={...output,scenarios:[{requirement:'Saving increases the count and keeps it after reload.',steps:[{action:'click',target:'#save',value:''},{action:'text',target:'#count',value:'1'},{action:'reload',target:'',value:''},{action:'text',target:'#count',value:'1'}]}]};
  const text=JSON.stringify(output),encoder=new TextEncoder();
  return new Response(new ReadableStream({start(controller){
    let finished=false;
    const emit=value=>controller.enqueue(encoder.encode('data: '+JSON.stringify(value)+'\n\n'));
    emit({type:'response.output_text.delta',delta:text.slice(0,25)});
    const timer=setTimeout(()=>{if(finished)return;finished=true;emit({type:'response.output_text.delta',delta:text.slice(25)});emit({type:'response.completed',response:{usage:{input_tokens:123,output_tokens:456,total_tokens:579}}});controller.close();},request.input.includes('CANCELAR')?15000:2000);
    options.signal.addEventListener('abort',()=>{if(finished)return;finished=true;clearTimeout(timer);controller.error(options.signal.reason);},{once:true});
  }}),{headers:{'Content-Type':'text/event-stream'}});
};
