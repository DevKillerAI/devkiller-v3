import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {SecretStore} from '../../modules/secrets.mjs';

const folder=path.dirname(fileURLToPath(import.meta.url));
export function anythingLLMVault(){
  if(!process.env.LOCALAPPDATA)throw new Error('Windows local storage unavailable.');
  const store=new SecretStore(path.join(process.env.LOCALAPPDATA,'DevKiller','secrets','anythingllm'));
  store.file=path.join(store.directory,'anythingllm.dpapi');
  return store;
}
async function validate(apiKey){
  try {
    const response=await fetch('http://127.0.0.1:3001/api/v1/auth',{headers:{Authorization:`Bearer ${apiKey}`},redirect:'error',signal:AbortSignal.timeout(8000)});
    await response.body?.cancel();
    return response.ok?'valid':response.status===401||response.status===403?'invalid':'unavailable';
  } catch {return 'unavailable';}
}
export function createConnectionServer({store=anythingLLMVault(),validateKey=validate}={}){
  const token=randomBytes(32).toString('hex');
  let saving=false;
  const server=http.createServer(async(req,res)=>{
    const origin=`http://127.0.0.1:${server.address().port}`;
    const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
    const json=(status,data)=>{res.writeHead(status,{...headers,'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
    if(req.headers.host!==new URL(origin).host)return json(403,{error:'Acesso local inválido.'});
    if(req.headers.origin&&req.headers.origin!==origin)return json(403,{error:'Abra esta tela pelo endereço local.'});
    if(req.headers['sec-fetch-site']==='cross-site')return json(403,{error:'Acesso externo bloqueado.'});
    try {
      if(req.method==='GET'&&req.url==='/api/status'){
        let configured=false;try{await fs.access(store.file);configured=true;}catch(error){if(error.code!=='ENOENT')throw error;}
        return json(200,{configured,token});
      }
      const assets={'/':['index.html','text/html'],'/style.css':['style.css','text/css'],'/app.js':['app.js','text/javascript']};
      if(req.method==='GET'&&Object.hasOwn(assets,req.url)){
        const [file,type]=assets[req.url];const body=await fs.readFile(path.join(folder,file));
        res.writeHead(200,{...headers,'Content-Type':`${type}; charset=utf-8`});return res.end(body);
      }
      if(req.method!=='POST'||req.url!=='/api/key')return json(404,{error:'Página não encontrada.'});
      if(req.headers.origin!==origin||req.headers['x-connect-token']!==token||req.headers['content-type']!=='application/json')return json(403,{error:'Reabra a tela para continuar.'});
      if(saving)return json(409,{error:'Já existe um salvamento em andamento.'});
      saving=true;
      let apiKey='';
      try {
        let body='';
        for await(const chunk of req){body+=chunk.toString('utf8');if(Buffer.byteLength(body)>4096)return json(413,{error:'Chave muito longa.'});}
        let input;try{input=JSON.parse(body);}catch{return json(400,{error:'Informe uma chave válida.'});}
        apiKey=typeof input.apiKey==='string'?input.apiKey.trim():'';
        input=null;body='';
        if(!/^[\x21-\x7e]{10,2000}$/.test(apiKey))return json(400,{error:'Confira a chave e tente novamente.'});
        const validation=await validateKey(apiKey);
        if(validation==='invalid')return json(401,{error:'O AnythingLLM não aceitou esta chave. Confira e tente novamente.'});
        if(validation!=='valid')return json(503,{error:'Não consegui acessar o AnythingLLM. Deixe o aplicativo aberto e tente novamente.'});
        await store.save(apiKey);
        return json(200,{saved:true,message:'Chave validada e guardada com a proteção do Windows. Você já pode fechar esta tela.'});
      } finally {apiKey='';saving=false;}
    } catch {if(!res.headersSent)json(500,{error:'Não foi possível guardar a chave. A chave anterior foi preservada. Tente novamente.'});else res.end();}
  });
  server.requestTimeout=15000;server.headersTimeout=10000;
  return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const server=createConnectionServer();
  server.on('error',()=>{console.error('Não foi possível iniciar a tela de conexão.');process.exitCode=1;});
  server.listen(Number(process.env.DEVKILLER_CONNECT_PORT||4312),'127.0.0.1',()=>console.log(`AnythingLLM connection: http://127.0.0.1:${server.address().port}/`));
}
