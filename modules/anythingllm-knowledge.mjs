import fs from 'node:fs/promises';
import {KnowledgeStore,KNOWLEDGE_VERSION,KNOWLEDGE_LIMITS,contextPayload,digest} from './knowledge.mjs';
import {tokenCount} from './knowledge-embeddings.mjs';
import {stackProfile} from './stacks.mjs';
import {retrievalNeeds,diversify,coverageFor} from './knowledge-selection.mjs';
import {anythingLLMVault} from '../tools/anythingllm-connect/server.mjs';

// Only the curated library is eligible. Research/evaluation workspaces are excluded.
export class AnythingLLMKnowledge extends KnowledgeStore {
  constructor(directory,{manifestFile=new URL('../knowledge/anythingllm.json',import.meta.url),loadKey=()=>anythingLLMVault().load(),fetchImpl=(...args)=>fetch(...args),...options}={}) {
    super(directory,options);Object.assign(this,{manifestFile,loadKey,fetchImpl});this.library=null;this.connection=null;
  }
  async initialize(){
    this.library=JSON.parse(await fs.readFile(this.manifestFile,'utf8'));
    if(this.library.workspace!=='devkiller-biblioteca'||!Array.isArray(this.library.documents)||!this.library.documents.length)throw new Error('Invalid AnythingLLM library manifest.');
    const ids=new Set();for(const d of this.library.documents){if(!/^[A-Z]+\d+$/.test(d.id)||ids.has(d.id)||typeof d.title!=='string'||!d.location||!/^[a-f0-9]{64}$/.test(d.hash)||!d.stacks?.length)throw new Error('Invalid AnythingLLM source.');ids.add(d.id);}
    // Curated code recipes are kept whole: a vector hit is often only a fragment.
    // Load only explicit local companions and verify bytes against the catalog hash.
    this.completeRecipes=new Map();
    for(const d of this.library.documents){
      if(!d.file)continue;
      if(!/^(design-v4\/D|studio-v1\/S|professional-v1\/P|curated-v1\/Q|pro-v1\/R|expansion-v1\/E|motion-v1\/M)\d{2}\.md$/.test(d.file))throw new Error('Invalid local recipe path.');
      const content=await fs.readFile(new URL('../knowledge/'+d.file,import.meta.url),'utf8');
      if(digest(content)!==d.hash)throw new Error('Local recipe does not match its catalog hash.');
      this.completeRecipes.set(d.id,content);
    }
    this.libraryHash=digest(JSON.stringify(this.library));await super.initialize();
    if(this.meta('mode')==='anythingllm')await this.checkConnection().catch(()=>{this.connection={ok:false,checkedAt:new Date().toISOString()};});
    return this.status();
  }
  sources(){const disabled=new Set(this.meta('anythingllmDisabled')||[]);return this.library.documents.map(d=>({...d,source:`AnythingLLM / ${this.library.workspace} / ${d.id}`,enabled:!disabled.has(d.id)}));}
  status(){
    const status=super.status();if(!status.ready||status.mode!=='anythingllm')return status;
    return {...status,provider:'anythingllm',workspace:this.library.workspace,sources:this.sources(),indexVersion:this.libraryHash,indexReady:this.connection?.ok===true,connection:this.connection,embeddingModel:'Managed by AnythingLLM',dimensions:null,usage:null,lastBuild:null};
  }
  async api(route,body,signal,workspace=this.library.workspace){
    if(!/^[a-z0-9_-]+$/.test(workspace))throw new Error('Invalid knowledge workspace.');
    signal?.throwIfAborted();let key;
    try{key=await this.loadKey();}catch{throw new Error('RAG: não foi possível abrir a chave protegida do AnythingLLM.');}
    if(!key)throw new Error('RAG: configure a chave do AnythingLLM antes de gerar.');
    const timeout=AbortSignal.timeout(20000),combined=signal?AbortSignal.any([signal,timeout]):timeout;
    try{
      const response=await this.fetchImpl(`http://127.0.0.1:3001/api/v1/workspace/${workspace}${route}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${key}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,redirect:'error',signal:combined});
      if(!response.ok){await response.body?.cancel();throw new Error(`HTTP ${response.status}`);}
      const reader=response.body.getReader();let size=0;const parts=[];
      try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2_000_000)throw new Error('Response too large');parts.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
      return JSON.parse(Buffer.concat(parts).toString('utf8'));
    }catch{
      signal?.throwIfAborted();this.connection={ok:false,checkedAt:new Date().toISOString()};
      throw new Error('RAG indisponível: não consegui consultar o AnythingLLM. Mantenha-o aberto e confira a conexão. A geração não continuará sem o RAG selecionado.');
    }finally{key='';}
  }
  async inventory(signal){
    const data=await this.api('',undefined,signal),workspace=Array.isArray(data.workspace)?data.workspace[0]:data.workspace;
    if(!workspace||workspace.slug!==this.library.workspace||!Array.isArray(workspace.documents))throw new Error('RAG: biblioteca do AnythingLLM inválida.');
    return new Set(workspace.documents.map(d=>d.docpath));
  }
  async checkConnection(signal){
    const inventory=await this.inventory(signal),missing=this.sources().filter(d=>d.enabled&&!inventory.has(d.location));
    if(missing.length){this.connection={ok:false,checkedAt:new Date().toISOString()};throw new Error('RAG: documentos da biblioteca ausentes: '+missing.map(d=>d.id).join(', '));}
    this.connection={ok:true,checkedAt:new Date().toISOString(),documents:inventory.size};return inventory;
  }
  async setMode(mode){if(mode==='anythingllm')await this.checkConnection();return super.setMode(mode);}
  setSource(id,enabled){
    if(this.meta('mode')!=='anythingllm')return super.setSource(id,enabled);
    if(typeof enabled!=='boolean'||!this.library.documents.some(d=>d.id===id))throw new Error('Invalid AnythingLLM source.');
    const disabled=new Set(this.meta('anythingllmDisabled')||[]);enabled?disabled.delete(id):disabled.add(id);this.meta('anythingllmDisabled',[...disabled]);return this.status();
  }
  async rebuild(options){if(this.meta('mode')==='anythingllm')throw new Error('O índice desta biblioteca é gerenciado no AnythingLLM.');return super.rebuild(options);}
  async validateContext(context,stack){
    if(context?.requestedMode!=='anythingllm')return super.validateContext(context,stack);
    if(context.mode!=='anythingllm'||!context.chunks?.length||context.indexVersion!==this.libraryHash||context.hash!==digest(contextPayload(context))||tokenCount(contextPayload(context))>KNOWLEDGE_LIMITS.contextTokens)throw new Error('RAG: contexto salvo inválido ou biblioteca alterada. Inicie uma nova geração.');
    const sources=new Map(this.sources().filter(d=>d.enabled&&d.stacks.includes(stack)).map(d=>[d.id,d]));
    for(const c of context.chunks){const source=sources.get(c.id);if(!source||c.hash!==digest(c.content)||c.catalogHash!==source.hash)throw new Error('RAG: fonte alterada ou desativada. Inicie uma nova geração.');}
    const inventory=await this.inventory();
    if(context.chunks.some(c=>!inventory.has(sources.get(c.id).location)))throw new Error('RAG: uma fonte do contexto salvo foi removida do AnythingLLM.');
  }
  async retrieve(options={}){
    const {query,stack,signal,mode=this.meta('mode')}=options;
    if(mode!=='anythingllm')return super.retrieve(options);
    stackProfile(stack);
    if(typeof query!=='string'||!query.trim()||query.length>KNOWLEDGE_LIMITS.queryCharacters)throw new Error('RAG: informe uma consulta de até 8.000 caracteres.');
    const started=Date.now();await this.checkConnection(signal);
    const needs=retrievalNeeds(query,stack),hits=[];
    // At most four vector searches. No LLM planner, retries or unbounded expansion.
    for(const need of needs){const response=await this.api('/vector-search',{query:(query.length<=250?query+'\n':'')+need.query+(need.id==='design'&&query.length>250?'\nProject context: '+query.slice(0,350):''),topN:20,scoreThreshold:0.2},signal);if(!Array.isArray(response.results))throw new Error('RAG: resposta de busca inválida.');hits.push(...response.results);}
    const allowed=new Map(this.sources().filter(d=>d.enabled&&d.stacks.includes(stack)).map(d=>[d.id,d])),seen=new Set();
    const context={version:KNOWLEDGE_VERSION,requestedMode:mode,mode,provider:'anythingllm',workspace:this.library.workspace,reason:'Busca real na biblioteca do AnythingLLM; contexto salvo antes da geração.',indexVersion:this.libraryHash,queryHash:digest(query),chunks:[],tokens:0,usage:{embeddingCalls:0,embeddingTokens:0,unknownCalls:0,retrievalCalls:1,providerUsageReported:false},durationMs:0};
    context.usage.retrievalCalls=needs.length;
    const candidates=[];
    for(const hit of hits.sort((a,b)=>b.score-a.score)){
      const source=allowed.get(hit.metadata?.chunkSource);
      if(!source||seen.has(source.id)||typeof hit.text!=='string'||!hit.text.trim()||hit.text.length>60000||!Number.isFinite(hit.score)||hit.score<0.2)continue;
      const content=this.completeRecipes.get(source.id)||hit.text;
      const chunk={id:source.id,title:source.title,source:source.source,hash:digest(content),catalogHash:source.hash,content,methods:['anythingllm-vector',...(this.completeRecipes.has(source.id)?['verified-complete-recipe']:[])],score:hit.score};
      candidates.push(chunk);seen.add(source.id);
    }
    // Explicitly requested library topics must not disappear because a broad
    // vector result favored a competing technology (for example GSAP over
    // Three.js). The curated, hash-verified companion is added only when that
    // exact topic was requested and its source is enabled for this stack. The
    // normal token and result limits still apply below.
    for(const need of needs)for(const id of need.requiredIds||[]){
      const source=allowed.get(id),content=this.completeRecipes.get(id);
      if(!source||!content||seen.has(id))continue;
      candidates.push({id,title:source.title,source:source.source,hash:digest(content),catalogHash:source.hash,content,methods:['verified-complete-recipe','explicit-topic-match'],score:1,selectedFor:need.id,selectionReason:'explicit-technology'});
      seen.add(id);
    }
    for(const chunk of diversify(candidates,needs)){
      context.chunks.push(chunk);
      if(tokenCount(contextPayload(context))>KNOWLEDGE_LIMITS.contextTokens){context.chunks.pop();continue;}
      if(context.chunks.length>=KNOWLEDGE_LIMITS.results)break;
    }
    if(!context.chunks.length)throw new Error('RAG: nenhuma referência elegível encontrada para o pedido. A geração foi pausada antes de chamar o modelo; revise a consulta ou selecione Off explicitamente.');
    context.coverage=coverageFor(context.chunks,needs);context.selectionVersion='needs-v2';
    context.tokens=tokenCount(contextPayload(context));context.hash=digest(contextPayload(context));context.durationMs=Date.now()-started;return context;
  }
}
